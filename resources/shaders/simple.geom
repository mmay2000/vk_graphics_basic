#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "common.h"

layout(triangles) in;
layout(triangle_strip, max_vertices = 20) out;

layout(push_constant) uniform params_t
{
    mat4 mProjView;
    mat4 mModel;
} params;



layout (location = 0 ) in VS_IN
{
    vec3 wPos;
    vec3 wNorm;
    vec3 wTangent;
    vec2 texCoord;

} vIn[];


layout (location = 0 ) out VS_OUT
{
    vec3 wPos;
    vec3 wNorm;
    vec3 wTangent;
    vec2 texCoord;

} vOut;

layout(binding = 0, set = 0) uniform AppData
{
  UniformParams Params;
};



vec3 GetNormal()
{
   vec3 a = vIn[0].wPos - vIn[1].wPos;
   vec3 b = vIn[2].wPos - vIn[1].wPos;
   return normalize(cross(a, b));
}  

vec3 explode(vec3 position, vec3 normal, vec3 tangent)
{

if (transpose(params.mModel) ==  mat4(
    0.999889,  0.0, -0.0149171, 0.0,
    0.0,       1.0,  0,        -1.27,
    0.0149171, 0.0,  0.999889,  0.0,
    0.0,       0.0,  0.0,       1.0))
    {
        float magnitude = 2.0;
        vec3 direction = normal  * (-abs(sin(Params.time/2.f)) + (sin(Params.time/2.f))) * magnitude 
        + tangent * (-abs(sin(Params.time/2.f))/5.f + (sin(Params.time/2.f))/5.f) * magnitude; 
        return position + direction;
    }
    
    return position;
} 

void main(void)
{
    vec3 normal = GetNormal();

    vOut.wPos = explode(vIn[0].wPos, normal, vIn[0].wTangent);
    gl_Position = params.mProjView * vec4(vOut.wPos, 1.0);
    vOut.texCoord = vIn[0].texCoord;
    vOut.wNorm    = normalize(mat3(transpose(inverse(params.mModel))) * vIn[0].wNorm.xyz);
    vOut.wTangent = normalize(mat3(transpose(inverse(params.mModel))) * vIn[0].wTangent.xyz);
    EmitVertex();
    vOut.wPos = explode(vIn[1].wPos, normal, vIn[1].wTangent);
    gl_Position = params.mProjView * vec4(vOut.wPos, 1.0);
    vOut.texCoord = vIn[1].texCoord;
    vOut.wNorm    = normalize(mat3(transpose(inverse(params.mModel))) * vIn[1].wNorm.xyz);
    vOut.wTangent = normalize(mat3(transpose(inverse(params.mModel))) * vIn[1].wTangent.xyz);
    EmitVertex();
    vOut.wPos = explode(vIn[2].wPos, normal, vIn[2].wTangent);
    gl_Position = params.mProjView * vec4(vOut.wPos, 1.0);
    vOut.texCoord = vIn[2].texCoord;
    vOut.wNorm    = normalize(mat3(transpose(inverse(params.mModel))) * vIn[2].wNorm.xyz);
    vOut.wTangent = normalize(mat3(transpose(inverse(params.mModel))) * vIn[2].wTangent.xyz);
    EmitVertex();
    EndPrimitive();
}