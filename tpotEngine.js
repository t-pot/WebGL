var SHADER_TYPE = {
	CONST: 0,
	DIFFUSE: 1,
	PHONG: 2,
	TONEMAP: 3,
}

var tpotEngine = function(){

	var screen_size = [640, 480];

	var create_shader = function(id, gl)
	{
		var shader;
		var scriptElement = document.getElementById(id);
		
		if(!scriptElement){return;}
		
		switch(scriptElement.type){
			
			case 'x-shader/x-vertex':
				shader = gl.createShader(gl.VERTEX_SHADER);
				break;
				
			case 'x-shader/x-fragment':
				shader = gl.createShader(gl.FRAGMENT_SHADER);
				break;
			default :
				return;
		}
		
		gl.shaderSource(shader, scriptElement.text);
		gl.compileShader(shader);
		
		if(!gl.getShaderParameter(shader, gl.COMPILE_STATUS)){
			alert(gl.getShaderInfoLog(shader));
		}

		return shader;
	}
	
	var create_program = function(vs, fs, gl){
		var program = gl.createProgram();
		
		gl.attachShader(program, vs);
		gl.attachShader(program, fs);
		gl.linkProgram(program);
		
		if(!gl.getProgramParameter(program, gl.LINK_STATUS)){
			alert(gl.getProgramInfoLog(program));
		}

		gl.useProgram(program);
		return program;
	}
	return {
		getContext: function(width, height)
		{
			var c = document.getElementById('canvas');
			c.width = screen_size[0] = width;
			c.height = screen_size[1] = height;

			var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
			
			if(gl==null){
				alert("WebGL is not supported!");
			}
			
			return gl;
		},

		get_program: function(shader_type, gl)
		{
			var vs_name, fs_name;
			
			switch(shader_type){
				
				case SHADER_TYPE.CONST:
					vs_name = 'Const_vs';
					fs_name = 'Const_fs';
					break;
					
				case SHADER_TYPE.DIFFUSE:
					vs_name = 'Diffuse_vs';
					fs_name = 'Diffuse_fs';
					break;

				case SHADER_TYPE.PHONG:
					vs_name = 'Phong_vs';
					fs_name = 'Phong_fs';
					break;

				case SHADER_TYPE.TONEMAP:
					vs_name = 'Tonemap_vs';
					fs_name = 'Tonemapt_fs';
					break;

				default :
					return;
			}

			return create_program(
				create_shader(vs_name, gl), 
				create_shader(fs_name, gl), 
				gl);
		},

		create_vbo: function(data, gl){
			var vbo = gl.createBuffer();
			
			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
			gl.bindBuffer(gl.ARRAY_BUFFER, null);
			
			return vbo;
		},

		create_ibo: function(data, gl){
			var ibo = gl.createBuffer();
			
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
			
			return ibo;
		},

		create_framebuffer: function(width, height, format, gl){
			if(width == 0){
				width = screen_size[0];
				height = screen_size[1];
			}
		
			var frameBuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
			
			// 深度バッファ用レンダーバッファの生成とバインド
			var depthRenderBuffer = gl.createRenderbuffer();
			gl.bindRenderbuffer(gl.RENDERBUFFER, depthRenderBuffer);
			gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
			gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthRenderBuffer);
			
			// フレームバッファ用テクスチャの生成
			var fTexture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, fTexture);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, format, null);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fTexture, 0);
			
			var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
			if (status != gl.FRAMEBUFFER_COMPLETE) {
				if(format == gl.FLOAT){
					alert("can not render to floating point textures");
				}else{
					alert("can not render to assigned textures");
				}
				return null;
			}
			
			gl.bindTexture(gl.TEXTURE_2D, null);
			gl.bindRenderbuffer(gl.RENDERBUFFER, null);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			
			return {f : frameBuffer, d : depthRenderBuffer, t : fTexture};
		},
		
		set_attribute: function(vbo, gl, prg, shader_type){

			gl.useProgram(prg);
			
			var nameLocation;
			var attStride;
			switch(shader_type){
				
				case SHADER_TYPE.CONST:
					nameLocation = ['position', 'color'];
					attStride = [3, 4];
					break;
					
				case SHADER_TYPE.DIFFUSE:
					nameLocation = ['position', 'normal', 'uv'];
					attStride = [3, 3, 2];
					break;

				case SHADER_TYPE.PHONG:
					nameLocation = ['position', 'normal', 'uv'];
					attStride = [3, 3, 2];
					break;

				case SHADER_TYPE.TONEMAP:
					nameLocation = ['position', 'uv'];
					attStride = [3, 2];

					break;

				default :
					return;
			}

			gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

			var attLocation = new Array(nameLocation.length);
			var StrideSum = 0;
			for(var i in nameLocation){
				attLocation[i] = gl.getAttribLocation(prg, nameLocation[i]);
				StrideSum += attStride[i];
			}

			var offset_attS = 0;
			for(var i in attLocation){
				gl.enableVertexAttribArray(attLocation[i]);
				gl.vertexAttribPointer(attLocation[i], attStride[i], gl.FLOAT, false, 4 * StrideSum, 4 * offset_attS);
				offset_attS += attStride[i];
			}
		},
		
		createTexture: function(filename, gl)
		{
			var tex = gl.createTexture();
			tex.image = new Image();

			tex.image.onload = function(){
				gl.bindTexture(gl.TEXTURE_2D, tex);
				gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.bindTexture(gl.TEXTURE_2D, null);
			};
			
			tex.image.src = filename;
			
			return tex;
		},
		
		screen_width: function(){return screen_size[0];},
		screen_height: function(){return screen_size[1];}
	};
}();

