#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "common.h"

layout (location = 0) out vec3 lightViewWposition;
layout (location = 1) out vec3 lightViewWnormal;
layout (location = 2) out vec3 flux;

layout (location = 0) in VS_OUT
{
  vec3 wPos;
  vec3 wNorm;
  vec2 texCoord;
} vsOut;

layout (push_constant) uniform params_t
{
    mat4 mProjView;
    mat4 mModel;
    uint albedoId;
} PushConstant;

layout (binding = 0, set = 0) uniform AppData
{
  UniformParams Params;
};

void main()
{
  lightViewWposition = vsOut.wPos;
  lightViewWnormal = vsOut.wNorm;
  switch(PushConstant.albedoId)
  {
  case 0:
    flux = vec3(1.0f, 0.0f, 0.0f);
    break;
  case 1:
    flux = vec3(1.0f, 1.0f, 0.0f);
    break;
  case 2:
    flux = vec3(1.0f, 1.0f, 1.0f);
    break;
  case 3:
    flux = vec3(0.0f, 1.0f, 0.0f);
    break;
  case 4:
    flux = vec3(0.0f, 1.0f, 1.0f);
    break;
  case 5:
    flux = vec3(1.0f, 0.0f, 1.0f);
    break;
  }
}