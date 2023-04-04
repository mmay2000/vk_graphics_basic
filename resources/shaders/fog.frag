#version 450
#extension GL_ARB_separate_shader_objects : enable
#extension GL_GOOGLE_include_directive : require

#include "common.h"

vec3 random3(vec3 c) {
	float j = 4096.0*sin(dot(c,vec3(17.0, 59.4, 15.0)));
	vec3 r;
	r.z = fract(512.0*j);
	j *= .125;
	r.x = fract(512.0*j);
	j *= .125;
	r.y = fract(512.0*j);
	return r-0.5;
}

/* skew constants for 3d simplex functions */
const float F3 =  0.3333333;
const float G3 =  0.1666667;

/* 3d simplex noise */
float simplex3d(vec3 p) {
	 /* 1. find current tetrahedron T and it's four vertices */
	 /* s, s+i1, s+i2, s+1.0 - absolute skewed (integer) coordinates of T vertices */
	 /* x, x1, x2, x3 - unskewed coordinates of p relative to each of T vertices*/
	 
	 /* calculate s and x */
	 vec3 s = floor(p + dot(p, vec3(F3)));
	 vec3 x = p - s + dot(s, vec3(G3));
	 
	 /* calculate i1 and i2 */
	 vec3 e = step(vec3(0.0), x - x.yzx);
	 vec3 i1 = e*(1.0 - e.zxy);
	 vec3 i2 = 1.0 - e.zxy*(1.0 - e);
	 	
	 /* x1, x2, x3 */
	 vec3 x1 = x - i1 + G3;
	 vec3 x2 = x - i2 + 2.0*G3;
	 vec3 x3 = x - 1.0 + 3.0*G3;
	 
	 /* 2. find four surflets and store them in d */
	 vec4 w, d;
	 
	 /* calculate surflet weights */
	 w.x = dot(x, x);
	 w.y = dot(x1, x1);
	 w.z = dot(x2, x2);
	 w.w = dot(x3, x3);
	 
	 /* w fades from 0.6 at the center of the surflet to 0.0 at the margin */
	 w = max(0.6 - w, 0.0);
	 
	 /* calculate surflet components */
	 d.x = dot(random3(s), x);
	 d.y = dot(random3(s + i1), x1);
	 d.z = dot(random3(s + i2), x2);
	 d.w = dot(random3(s + 1.0), x3);
	 
	 /* multiply d by w^4 */
	 w *= w;
	 w *= w;
	 d *= w;
	 
	 /* 3. return the sum of the four surflets */
	 return dot(d, vec4(52.0));
}

layout(location = 0) out vec4 color;

layout (location = 0 ) in VS_OUT
{
    vec3 pos;
} surf;

layout(push_constant) uniform params_t
{
    mat4 mPrayOriginjView;
    mat4 mModel;
    uint quadResolution;
    float minHeight;
    float maxHeight;
} params;

layout(binding = 0, set = 0) uniform AppData
{
  UniformParams Params;
};

layout(binding = 1, set = 0) uniform Noise_t
{
  NoiseData noise;
};

float boxSDF(vec3 p, vec3 b)
{
  vec3 d = abs(p) - b;
  return min(max(d.x,max(d.y,d.z)),0.0) + length(max(d,0.0));
}

float sphereSDF(vec3 query_position, vec3 position, float radius)
{
    return length(query_position - position) - radius;
}

float capsuleSDF( vec3 queryPos, vec3 a, vec3 b, float r )
{
  vec3 pa = queryPos - a, ba = b - a;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - r;
}

float smoothUnion( float d1, float d2, float k ) {
    float h = clamp( 0.5 + 0.5*(d2-d1)/k, 0.0, 1.0 );
    return mix( d2, d1, h ) - k*h*(1.0-h); }


float smoothSubtraction( float d1, float d2, float k ) 
{
    float h = clamp( 0.5 - 0.5*(d2+d1)/k, 0.0, 1.0 );
    return mix( d2, -d1, h ) + k*h*(1.0-h); 
}

vec3 bendPoint(vec3 p, float k)
{
    float c = cos(k*p.y);
    float s = sin(k*p.y);
    mat2  m = mat2(c,-s,s,c);
    vec3  q = vec3(m*p.xy,p.z);
    return q;
}

float mushroom(vec3 queryPos)
{
    float sphere = sphereSDF(queryPos, vec3(0, 2,-10), 3);
    float box = boxSDF(queryPos, vec3(15, 2, 15));
    float upPart = smoothSubtraction(box, sphere, 0.2);
    float capsuleRoot = capsuleSDF(queryPos, vec3(0.0, 0.0, -10), vec3(0.0, 2, -10), 1.5);
    
    float mushroom = smoothUnion(upPart, capsuleRoot, 0.2);
    return mushroom;
}

float FogSDF(vec3 queryPos)
{
    vec3  bendPos = bendPoint(queryPos, 0.3 * cos(1.5 * Params.time));
    return mushroom(bendPos + vec3(0.0, 0.5, 0.0));
}

vec2 boxIntersection(vec3 ro, vec3 rd, vec3 boxSize)
{
    vec3 m = 1.0 / rd;
    vec3 n = m * ro;
    vec3 k = abs(m) * boxSize;
    vec3 t1 = -n - k;
    vec3 t2 = -n + k;
    float tN = max(max(t1.x, t1.y), t1.z);
    float tF = min(min(t2.x, t2.y), t2.z);
    if(tN > tF || tF < 0.0)
    {
        return vec2(-1.0, -1.0);
    }
    return vec2(tN, tF);
}

float getDensity(vec3 pos)
{
    if(FogSDF(pos) < 0)
        return simplex3d(vec3(noise.scale.x * pos.x + 5. * sin(0.1 * Params.time),
                  noise.scale.y * pos.y + 0.3 * sin(0.5 * Params.time),
                  noise.scale.z * pos.z + 5. * cos(0.1 * Params.time)));
    else return 0;
}

void main()
{
    vec3 rayDirection = normalize(Params.eyePos - surf.pos);
    vec3 rayOrigin = surf.pos - rayDirection;

    vec2 intersection = boxIntersection(rayOrigin, rayDirection, noise.semiAxes);
    vec3 entry = rayOrigin + intersection.x * rayDirection;
    vec3 exit  = rayOrigin + intersection.y * rayDirection;

    const int MAX_STEPS = 100 * int((noise.semiAxes.x + noise.semiAxes.y + noise.semiAxes.z) / 3.f);
    float stepSize = length(exit - entry) / MAX_STEPS;

    float transmittance = 1.0;
    vec3 point = entry;
    for (int steps = 0; steps < MAX_STEPS; ++steps) {
        point -= rayDirection * stepSize;
        float density = getDensity(point);
        if (density > 0) {
            transmittance *= exp(-density * stepSize * noise.extinction);
            if (transmittance < 0.01)
              break;
        }
    }

    float grayValue = mix(0.6, 0.4, transmittance);
    color = vec4(grayValue, grayValue, grayValue, 1 - transmittance);
}