#version 450
#extension GL_ARB_separate_shader_objects : enable

layout(location = 0) out vec4 color;

layout (binding = 0) uniform sampler2D colorFog;
layout (binding = 1) uniform sampler2D colorTex;

layout (location = 0 ) in VS_OUT
{
  vec2 texCoord;
} surf;

void main()
{
  vec4 clearColor = textureLod(colorTex, surf.texCoord, 0);
  vec4 fog = textureLod(colorFog, surf.texCoord, 0);
  color = clearColor + fog;
}
