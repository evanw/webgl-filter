function ZoomBlurFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float strength;\
        varying vec2 texCoord;\
        \
        /* random number between 0 and 1 */\
        float random(vec3 scale, float seed) {\
            /* use the fragment position for randomness */\
            return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
        }\
        \
        void main() {\
            vec3 color = vec3(0.0);\
            float total = 0.0;\
            vec2 toCenter = center - texCoord;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = 0.0; t <= 60.0; t++) {\
                float percent = (t + offset) / 60.0;\
                float weight = 4.0 * (percent - percent * percent);\
                color += texture2D(texture, texCoord + toCenter * percent * strength).rgb * weight;\
                total += weight;\
            }\
            gl_FragColor = vec4(color / total, 1.0);\
        }\
    ');

    slider(this, 'Strength', 0, 1, 0.5, 0.01, function(value) {
        this.strength = value;
    });

    this.center = [0.5, 0.5];
    marker(this, function(x, y) {
        this.center = [x, y];
    });
}

ZoomBlurFilter.prototype.name = 'Zoom Blur';

ZoomBlurFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            center: [this_.center[0] / original.width, this_.center[1] / original.height],
            strength: this_.strength
        }).drawRect();
    });
};
