#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "common.h"

layout(location = 0) out vec4 gNorm;
layout(location = 1) out vec4 gAlbedoSpec;

layout (location = 0 ) in VS_OUT
{
    vec3 wPos;
    vec3 wNorm;
    vec3 wTangent;
    vec2 texCoord;
} surf;



void main()
{
    gNorm = vec4(0.5f*normalize(surf.wNorm) + vec3(0.5f), 1);

    gAlbedoSpec.rgb = vec3(0.26f, 0.53f, 0.96f);
    gAlbedoSpec.a = 0.8f;
}