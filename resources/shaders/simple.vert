#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "unpack_attributes.h"
#include "common.h"


layout(location = 0) in vec4 vPosNorm;
layout(location = 1) in vec4 vTexCoordAndTang;

layout(push_constant) uniform params_t
{
    mat4 mProjView;
    mat4 mModel;
} params;


layout(binding = 0, set = 0) uniform AppData
{
    UniformParams Params;
};


layout (location = 0 ) out VS_OUT
{
    vec3 wPos;
    vec3 wNorm;
    vec3 wTangent;
    vec2 texCoord;

} vOut;


out gl_PerVertex { vec4 gl_Position; };
void main(void)
{
    const vec4 wNorm = vec4(DecodeNormal(floatBitsToInt(vPosNorm.w)),         0.0f);
    const vec4 wTang = vec4(DecodeNormal(floatBitsToInt(vTexCoordAndTang.z)), 0.0f);


   if (transpose(params.mModel) ==  mat4(
    0.999889,  0.0, -0.0149171, 0.0,
    0.0,       1.0,  0,        -1.27,
    0.0149171, 0.0,  0.999889,  0.0,
    0.0,       0.0,  0.0,       1.0))
        vOut.wPos  = (params.mModel * vec4(vec3(vPosNorm.x - sin(Params.time) * 0.2f, vPosNorm.y + abs(cos(Params.time)) * 0.1f, vPosNorm.z), 1.0f)).xyz;
    else
        vOut.wPos  = (params.mModel * vec4(vPosNorm.xyz, 1.0f)).xyz;
    
    vOut.wNorm    = normalize(mat3(transpose(inverse(params.mModel))) * wNorm.xyz);
    vOut.wTangent = normalize(mat3(transpose(inverse(params.mModel))) * wTang.xyz);
    vOut.texCoord = vTexCoordAndTang.xy;

    gl_Position   = params.mProjView * vec4(vOut.wPos, 1.0);
}
