function BrightnessContrastFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float brightness;\
        uniform float contrast;\
        varying vec2 texCoord;\
        void main() {\
            vec3 color = texture2D(texture, texCoord).rgb;\
            color += brightness;\
            if (contrast > 0.0) {\
                color = (color - 0.5) / (1.0 - contrast) + 0.5;\
            } else {\
                color = (color - 0.5) * (1.0 + contrast) + 0.5;\
            }\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Brightness', -1, 1, 0, 0.02, function(value) {
        this.brightness = value;
    });
    slider(this, 'Contrast', -1, 1, 0, 0.02, function(value) {
        this.contrast = value;
    });
}

BrightnessContrastFilter.prototype.name = 'Brightness / Contrast';

BrightnessContrastFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            brightness: this_.brightness,
            contrast: this_.contrast
        }).drawRect();
    });
};
