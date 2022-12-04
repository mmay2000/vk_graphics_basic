#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "common.h"

layout(location = 0) out vec4 gNorm;
layout(location = 1) out vec4 gAlbedoSpec;

layout(binding = 0, set = 0) uniform AppData
{
    UniformParams Params;
};

layout (location = 0 ) in VS_OUT
{
    vec3 wPos;
    vec3 wNorm;
    vec3 color;
    vec2 texCoord;
} surf;


layout(push_constant) uniform params_t
{
    mat4 mProjView;
    mat4 mModel;
} params;

void main()
{
    gNorm = vec4((surf.wNorm), 1.0f);

    gAlbedoSpec = vec4(surf.color, 1.0f);
}