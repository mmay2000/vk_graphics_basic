#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "common.h"

layout (location = 0) out vec4 out_fragColor;

layout (location = 0) in VS_OUT
{
  vec2 texCoord;
} vsOut;

layout(binding = 0, set = 0) uniform AppData
{
  UniformParams Params;
};

layout (binding = 1) uniform sampler2D shadowMap;
layout (binding = 2) uniform sampler2D positionMap;
layout (binding = 3) uniform sampler2D normalMap;
layout (binding = 4) uniform sampler2D albedoMap;
layout (binding = 5) uniform sampler2D ssaoMap;

 
vec3 T(float s) {
    return vec3(0.233f, 0.455f, 0.649f) * exp(-s*s/0.0064f) +
           vec3(0.1f,   0.336f, 0.344f) * exp(-s*s/0.0484f) +
           vec3(0.118f, 0.198f, 0.0f)   * exp(-s*s/0.187f)  +
           vec3(0.113f, 0.007f, 0.007f) * exp(-s*s/0.567f)  +
           vec3(0.358f, 0.004f, 0.0f)   * exp(-s*s/1.99f)   +
           vec3(0.078f, 0.0f,   0.0f)   * exp(-s*s/7.41f);
}

const float zNear     = 0.1;
const float zFar      = 100.0;

float linearDepth ( float d )
{
    return zFar * zNear / (d * (zFar - zNear) - zFar );
}


void main()
{
  const vec3 wPos = (Params.viewInverse * vec4(texture(positionMap, vsOut.texCoord).xyz, 1.0)).xyz;
  const vec4 posLightClipSpace = Params.lightMatrix*vec4(wPos, 1.0f);
  const vec3 posLightSpaceNDC  = posLightClipSpace.xyz/posLightClipSpace.w;    // for orto matrix, we don't need perspective division, you can remove it if you want; this is general case;
  vec2 shadowTexCoord    = posLightSpaceNDC.xy*0.5f + vec2(0.5f, 0.5f);  // just shift coords from [-1,1] to [0,1]               

  const bool  outOfView = (shadowTexCoord.x < 0.0001f || shadowTexCoord.x > 0.9999f || shadowTexCoord.y < 0.0091f || shadowTexCoord.y > 0.9999f);
  float depth = textureLod(shadowMap, shadowTexCoord, 0).x;
  
  const float shadow    = ((posLightSpaceNDC.z < depth + 0.001f) || outOfView) ? 1.0f : 0.0f;

  const vec4 dark_violet = vec4(0.59f, 0.0f, 0.82f, 1.0f);
  const vec4 chartreuse  = vec4(0.5f, 1.0f, 0.0f, 1.0f);

  vec4 lightColor1 = mix(dark_violet, chartreuse, abs(sin(Params.time)));

  const vec3 normal = (Params.viewInverse * texture(normalMap, vsOut.texCoord)).xyz;
  vec4 albedo     = texture(albedoMap, vsOut.texCoord);
  if (albedo == vec4(0.0, 0.0, 0.0, 1.0))
  {
    out_fragColor = vec4(0.0);
  }
  else
  {
    float ao = texture(ssaoMap, vsOut.texCoord).r;
    vec3 lightDir   = normalize(Params.lightPos - wPos);
    vec4 lightColor = max(dot(normal, lightDir), 0.0f) * lightColor1;
    out_fragColor   = (lightColor*shadow + vec4(0.4f)) * albedo * ao;
    if (Params.sssEnabled)
      {
        const float linearShadowMapDepth = linearDepth(depth);
        const float linearDepth = (Params.lightView*vec4(wPos, 1.0f)).z;
        const float s = abs(linearShadowMapDepth-linearDepth)*0.1f;
        const float E = max(0.3+dot(-normal, lightDir), 0.0);
        const vec4 transmittance = (vec4(T(s), 1.0f)*vec4(1.0f, 1.0f, 1.0f, 1.0f)*albedo*E) / 2.2f;
        out_fragColor += transmittance;
      }
  }
}