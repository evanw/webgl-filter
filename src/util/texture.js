var Texture = (function() {
    function initTexture(texture) {
        gl.bindTexture(gl.TEXTURE_2D, texture.id);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        texture.setTiled(false);
    }
    
    Texture.fromImage = function(image) {
        var texture = new Texture(image.width, image.height, gl.RGBA, gl.UNSIGNED_BYTE);
        initTexture(texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        return texture;
    };
    
    Texture.fromCanvas = Texture.fromImage;
    
    function Texture(width, height, format, type) {
        this.id = gl.createTexture();
        this.width = width;
        this.height = height;
        this.format = format;
        this.type = type;
        this.isZombie = false;

        if (width && height) {
            initTexture(this);
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
        }
    }

    Texture.prototype.__delete__ = function() {
        gl.deleteTexture(this.id);
        this.id = null;
        this.isZombie = true;
    };
    
    Texture.prototype.setTiled = function(isTiled) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, isTiled ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, isTiled ? gl.REPEAT : gl.CLAMP_TO_EDGE);
    };

    Texture.prototype.use = function(unit) {
        if (this.isZombie) throw 'attempted to use a texture after deleting it';
        gl.activeTexture(gl.TEXTURE0 + (unit || 0));
        gl.bindTexture(gl.TEXTURE_2D, this.id);
    };
    
    var cache = {};
    var framebuffer = null;
    
    Texture.emptyCache = function() {
        for (var name in cache) {
            if (cache.hasOwnProperty(name)) {
                cache[name].__delete__();
            }
        }
        cache = {};
    };
    
    Texture.prototype.drawTo = function(callback) {
        // start rendering to this texture
        framebuffer = framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
        gl.viewport(0, 0, this.width, this.height);

        // do the drawing
        callback();

        // stop rendering to this
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };
    
    Texture.prototype.drawToUsingSelf = function(callback) {
        // get an extra texture of the same size from the cache
        var name = this.width + '_' + this.height + '_' + this.format + '_' + this.type;
        if (!cache.hasOwnProperty(name)) {
            cache[name] = new Texture(this.width, this.height, this.format, this.type);
        }
        var spareTexture = cache[name];
        
        // start rendering to spareTexture
        framebuffer = framebuffer || gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, spareTexture.id, 0);
        gl.viewport(0, 0, this.width, this.height);
        this.use();

        // do the drawing
        callback();

        // stop rendering to spareTexture
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.swapWith(spareTexture);
    };
    
    var canvas = null;
    
    Texture.prototype.fillUsingCanvas = function(callback) {
        if (canvas == null) canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = this.height;
        callback(canvas.getContext('2d'));
        this.format = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        return this;
    };
    
    Texture.prototype.swapWith = function(other) {
        var temp;
        temp = other.id; other.id = this.id; this.id = temp;
        temp = other.width; other.width = this.width; this.width = temp;
        temp = other.height; other.height = this.height; this.height = temp;
        temp = other.format; other.format = this.format; this.format = temp;
    };
    
    return Texture;
})();
