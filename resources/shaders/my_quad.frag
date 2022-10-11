#version 450
#extension GL_ARB_separate_shader_objects : enable

layout(location = 0) out vec4 color;

layout (binding = 0) uniform sampler2D colorTex;

layout (location = 0 ) in VS_OUT
{
  vec2 texCoord;
} surf;

void main()
{
  
	ivec2 size2D = textureSize(colorTex,0);
	float compR = 0;
	float compG = 0;
	float compB = 0;
	float spaceWeightR = 0;
	float spaceWeightG = 0;
	float spaceWeightB = 0;
	const float sigmaSpaceDoubleSqr = 50.f; //sigma = 5.
	const float sigmaColorDoubleSqr =  1.28f; //sigma = 0.8
	vec4 centerPix = textureLod(colorTex, surf.texCoord, 0);

	
	for(float i = -15; i < 16; ++i)
	{
		float y, x = surf.texCoord.x + i/size2D.x;

		for(float j = -15; j < 16; ++j)
		{
			y = surf.texCoord.y + j/size2D.y;

			if (x < 0 || x >= size2D.x)
			{
				x = surf.texCoord.x;
			}
			if (y < 0 || y >= size2D.y)
			{
				y = surf.texCoord.y;
			}

			vec4 pixCol = textureLod(colorTex, vec2(x, y), 0);
			
			spaceWeightR += exp(-((i/size2D.x - surf.texCoord.x) * (i/size2D.x - surf.texCoord.x)
			+(j/size2D.y - surf.texCoord.y)*(j/size2D.y - surf.texCoord.y))/sigmaSpaceDoubleSqr
			- ((pixCol.x)-(centerPix.x)) * ((pixCol.x)-(centerPix.x))/sigmaColorDoubleSqr); 
			
			compR += (exp(-((i/size2D.x - surf.texCoord.x) * (i/size2D.x - surf.texCoord.x)
			+(j/size2D.y - surf.texCoord.y)*(j/size2D.y - surf.texCoord.y))/sigmaSpaceDoubleSqr
			- ((pixCol.x)-(centerPix.x)) * ((pixCol.x)-(centerPix.x))/sigmaColorDoubleSqr)) * pixCol.x;
			
			spaceWeightG += exp(-((i/size2D.x - surf.texCoord.x) * (i/size2D.x - surf.texCoord.x)
			+(j/size2D.y - surf.texCoord.y)*(j/size2D.y - surf.texCoord.y))/sigmaSpaceDoubleSqr
			- ((pixCol.g)-(centerPix.g)) * ((pixCol.g)-(centerPix.g))/sigmaColorDoubleSqr);

			compG +=  (exp(-((i/size2D.x - surf.texCoord.x) * (i/size2D.x - surf.texCoord.x)
			+(j/size2D.y - surf.texCoord.y)*(j/size2D.y - surf.texCoord.y))/sigmaSpaceDoubleSqr
			- ((pixCol.g)-(centerPix.g)) * ((pixCol.g)-(centerPix.g))/sigmaColorDoubleSqr)) * pixCol.g;
			
			spaceWeightB += exp( -((i/size2D.x - surf.texCoord.x) * (i/size2D.x - surf.texCoord.x)
			+(j/size2D.y - surf.texCoord.y)*(j/size2D.y - surf.texCoord.y)) /sigmaSpaceDoubleSqr
			- ((pixCol.b)-(centerPix.b)) * ((pixCol.b)-(centerPix.b))/sigmaColorDoubleSqr );

			compB +=  ( exp( -((i/size2D.x - surf.texCoord.x) * (i/size2D.x - surf.texCoord.x)
			+(j/size2D.y - surf.texCoord.y)*(j/size2D.y - surf.texCoord.y)) /sigmaSpaceDoubleSqr
			- ((pixCol.b)-(centerPix.b)) * ((pixCol.b)-(centerPix.b))/sigmaColorDoubleSqr )) * centerPix.b;
			
		}
		
	}
	
	color = vec4(compR/spaceWeightR, compG/spaceWeightG, compB/spaceWeightB, 0);
}
