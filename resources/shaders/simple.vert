#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "unpack_attributes.h"
#include "common.h"

layout(location = 0) in vec4 vPosNorm;
layout(location = 1) in vec4 vTexCoordAndTang;

layout(binding = 0, set = 0) uniform AppData
{
    UniformParams Params;
};


layout(push_constant) uniform params_t
{
    mat4 mProjView;
    mat4 mModel;
} params;


layout (location = 0 ) out VS_OUT
{
    vec3 wPos;
    vec3 wNorm;
    vec3 color;
    vec2 texCoord;

} vOut;


out gl_PerVertex { vec4 gl_Position; };
void main(void)
{
    const vec4 wNorm = vec4(DecodeNormal(floatBitsToInt(vPosNorm.w)),         0.0f);
    const vec4 wTang = vec4(DecodeNormal(floatBitsToInt(vTexCoordAndTang.z)), 0.0f);

    vOut.wPos     = (params.mModel * vec4(vPosNorm.xyz, 1.0f)).xyz;
    vOut.wNorm    = normalize(mat3(transpose(inverse(params.mModel))) * wNorm.xyz);
    vOut.texCoord = vTexCoordAndTang.xy;

    gl_Position   = params.mProjView * vec4(vOut.wPos, 1.0);
    
    //gl_Position = vec4(gl_Position.xyz/gl_Position.w, 1);

    if (transpose(params.mModel) == mat4(0.999889, 0.0, -0.0149171, 0.0, 
                                        0.0, 1.0, 0.0, -1.27, 
                                        0.0149171, 0.0, 0.999889, 0.0, 
                                        0.0, 0.0, 0.0, 1.0))
        vOut.color = vec3(0.195, 0.656, 0.321);
    else
        if (transpose(params.mModel) == mat4(1.0, 0.0, 0.0, 0.985493, 
                                            0.0, 1.0, 0.0, -1.27, 
                                            0.0, 0.0, 1.0, 0.512028, 
                                            0.0, 0.0, 0.0, 1.0))
            vOut.color = vec3(0.259, 0.612, 0.656);
        else
            if (transpose(params.mModel) == mat4(1.0, 0.0, 0.0, -0.826185, 
                                                0.0, 1.0, 0.0, -1.27, 
                                                0.0, 0.0, 1.0, 0.809034, 
                                                0.0, 0.0, 0.0, 1.0 ))
                vOut.color = vec3(1.0 , 0.0, 0.416);
            else
                if (transpose(params.mModel) == mat4(0.824126, 0.0, 0.566406, -0.0100791, 
                                                    0.0, 1.0, 0.0, -1.27, 
                                                    -0.566406, 0.0, 0.824126, 0.872508, 
                                                    0.0, 0.0, 0.0, 1.0 ))
                    vOut.color = vec3(1.0, 0.584, 0.0);
                else
                    vOut.color = vec3(0.59f, 0.0f, 0.82f);
}
