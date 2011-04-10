function GlassFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float angle;\
        uniform float scale;\
        varying vec2 texCoord;\
        \
        vec2 rotate(vec2 vec, float percent) {\
            return vec2(vec.x * cos(6.28318531 * percent), vec.y * sin(6.28318531 * percent));\
        }\
        \
        vec2 crazyNoise(vec2 position) {\
            /* inspired from http://http.developer.nvidia.com/GPUGems/gpugems_ch05.html */\
            vec2 noise = vec2(1.0, 0.0);\
            float scale = 0.25;\
            for(int i = 0; i < 3; i++) {\
                vec2 sample = position.xy * scale;\
                noise = rotate(noise, sample.x + sample.y + sin(position.x * scale) + sin(position.y * scale));\
                scale *= 2.0;\
            }\
            return noise;\
        }\
        \
        void main() {\
            float size = (0.1 + scale) * 80.0;\
            vec2 coord = texCoord * size;\
            float s = sin(angle), c = cos(angle);\
            vec2 rotatedCoord = vec2(\
                c * coord.x - s * coord.y,\
                s * coord.x + c * coord.y\
            );\
            vec2 noise = crazyNoise(rotatedCoord) * 0.25 + crazyNoise(rotatedCoord * 0.5) * 0.75;\
            coord = (coord + noise) / size;\
            vec3 color = texture2D(texture, coord).rgb;\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Angle', -1, 1, 0, 0.02, function(value) {
        this.angle = value;
    });
    slider(this, 'Scale', 0, 1, 0.5, 0.01, function(value) {
        this.scale = value;
    });
}

GlassFilter.prototype.name = 'Glass';

GlassFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            angle: this_.angle,
            scale: this_.scale
        }).drawRect();
    });
};
