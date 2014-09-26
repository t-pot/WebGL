onload = function(){

	var gl = tpotEngine.getContext(512, 512);
	
	// シーン描画用のオブジェクト
	var prg = tpotEngine.get_program(SHADER_TYPE.PHONG, gl);
	
	// VBOの生成
	var vbo = tpotEngine.create_vbo(teapot_vtx_xnt, gl);
	var ibo = tpotEngine.create_ibo(teapot_index, gl);
	var tex = tpotEngine.createTexture('t-pot.png', gl);
	
	// uniformLocationの取得
	var uniLocation = new Array();
	uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
	uniLocation[1] = gl.getUniformLocation(prg, 'invMatrix');
	uniLocation[2] = gl.getUniformLocation(prg, 'lightDirection');
	uniLocation[3] = gl.getUniformLocation(prg, 'eyeDirection');
	uniLocation[4] = gl.getUniformLocation(prg, 'ambientColor');
	uniLocation[5] = gl.getUniformLocation(prg, 'texture');

	// トーンマッピング用のオブジェクト初期化
	var prg_tonemap = tpotEngine.get_program(SHADER_TYPE.TONEMAP, gl);
	var vbo_tonemap = tpotEngine.create_vbo(
		[-1,-1,0.5, 0,0,
		 +1,-1,0.5, 1,0,
		 -1,+1,0.5, 0,1,
		 +1,+1,0.5, 1,1], 
		gl);
	var ibo_tonemap = tpotEngine.create_ibo(
		[0,1,2, 1,3,2], 
		gl);

	var format = gl.FLOAT;
	var ext = gl.getExtension('OES_texture_float');
	if(ext == null){
		format = gl.UNSIGNED_BYTE;
		alert("OES_texture_float is not supported!");
	}
	
	var fBuffer = tpotEngine.create_framebuffer(0, 0, format, gl);
	if(fBuffer == null && format == gl.FLOAT){
		fBuffer = tpotEngine.create_framebuffer(0, 0, gl.UNSIGNED_BYTE, gl);
	}
	
	var uniLocation_tonemap = new Array();
	uniLocation_tonemap[0] = gl.getUniformLocation(prg_tonemap, 'texture');
	
	// 各種行列の生成と初期化
	var mMatrix = tpotMat.identity();
	var vMatrix = tpotMat.identity();
	var pMatrix = tpotMat.identity();
	var tmpMatrix = tpotMat.identity();
	var mvpMatrix = tpotMat.identity();
	var invMatrix = tpotMat.identity();
	
	var lightDirection = [1.5, 1.0, 0.5];		// 平行光源の向き
	var ambientColor = [0.1, 0.1, 0.1, 1.0];	// 環境光の色
	var eyeDirection = [0.0, 1.0, 5.0];			// 視点ベクトル
	
	// 変換行列
	tpotMat.lookAt(eyeDirection, [1, -1, 0], [0, 1, 0], vMatrix);
	tpotMat.perspective(45, tpotEngine.screen_width() / tpotEngine.screen_height(), 0.1, 100, pMatrix);
	tpotMat.multiply(pMatrix, vMatrix, tmpMatrix);
	
	// 状態初期化
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	
	// カウンタの宣言
	var frames = 0;
	
	(function(){
		// フレームバッファの変更
		gl.bindFramebuffer(gl.FRAMEBUFFER, fBuffer.f);

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clearDepth(1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.viewport(0.0, 0.0, 512, 512);
		
		gl.enable(gl.DEPTH_TEST);
		
		// シーンの描画
		var rad = (frames % 360) * Math.PI / 180;
		
		if(gl.isTexture(tex)){ // wait for load texture
			tpotEngine.set_attribute(vbo, gl, prg, SHADER_TYPE.PHONG);
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindTexture(gl.TEXTURE_2D, tex);
			
			mMatrix = tpotMat.identity();
			tpotMat.translate(mMatrix, [1.0, -1.0, 0.0], mMatrix);
			tpotMat.rotate(mMatrix, rad, [0, 1, 0], mMatrix);

			tpotMat.multiply(tmpMatrix, mMatrix, mvpMatrix);
			tpotMat.inverse(mMatrix, invMatrix);

			gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
			gl.uniformMatrix4fv(uniLocation[1], false, invMatrix);
			gl.uniform3fv(uniLocation[2], lightDirection);
			gl.uniform3fv(uniLocation[3], eyeDirection);
			gl.uniform4fv(uniLocation[4], ambientColor);
			gl.uniform1i(uniLocation[5], 0);
			
			gl.drawElements(gl.TRIANGLES, 3*2328, gl.UNSIGNED_SHORT, 0);
		}
		
		
		// 元のフレームバッファに戻す
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		
		gl.disable(gl.DEPTH_TEST);
		gl.viewport(0.0, 0.0, 512, 512);

		// 画面全体を覆うスクリーンを描いてトーンマッピング
		tpotEngine.set_attribute(vbo_tonemap, gl, prg_tonemap, SHADER_TYPE.TONEMAP);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo_tonemap);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, fBuffer.t);
		gl.uniform1i(uniLocation_tonemap[0], 0);
		
		gl.drawElements(gl.TRIANGLES, 3*2, gl.UNSIGNED_SHORT, 0);

		// 描画更新
		gl.flush();
		
		// 更新を待つ
		frames++;
		setTimeout(arguments.callee, 1000 / 60);
	})();
};

