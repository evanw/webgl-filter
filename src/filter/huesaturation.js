function HueSaturationFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float hue;\
        uniform float saturation;\
        varying vec2 texCoord;\
        void main() {\
            vec3 color = texture2D(texture, texCoord).rgb;\
            \
            /* hue adjustment, wolfram alpha: RotationTransform[angle, {1, 1, 1}][{x, y, z}] */\
            float angle = hue * 3.14159265;\
            float s = sin(angle), c = cos(angle);\
            vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;\
            float len = length(color);\
            color = vec3(\
                dot(color, weights.xyz),\
                dot(color, weights.zxy),\
                dot(color, weights.yzx)\
            );\
            \
            /* saturation adjustment */\
            float average = (color.x + color.y + color.z) / 3.0;\
            if (saturation > 0.0) {\
                color += (average - color) * (1.0 - 1.0 / (1.0 - saturation));\
            } else {\
                color += (average - color) * (-saturation);\
            }\
            \
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Hue', -1, 1, 0, 0.02, function(value) {
        this.hue = value;
    });
    slider(this, 'Saturation', -1, 1, 0, 0.02, function(value) {
        this.saturation = value;
    });
}

HueSaturationFilter.prototype.name = 'Hue / Saturation';

HueSaturationFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            hue: this_.hue,
            saturation: this_.saturation
        }).drawRect();
    });
};
