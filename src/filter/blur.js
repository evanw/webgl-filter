function BlurFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float radius;\
        uniform vec2 delta;\
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
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                color += texture2D(texture, texCoord + delta * percent * radius).rgb * weight;\
                total += weight;\
            }\
            gl_FragColor = vec4(color / total, 1.0);\
        }\
    ');

    slider(this, 'Radius', 0, 100, 50, 1, function(value) {
        this.radius = value;
    });

    this.tempTexture = null;
}

BlurFilter.prototype.name = 'Blur';

BlurFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            delta: [1 / 800, 0],
            radius: this_.radius
        }).drawRect();
    });
    texture.drawToUsingSelf(function() {
        texture.use();
        this_.shader.uniforms({
            delta: [0, 1 / 600],
            radius: this_.radius
        }).drawRect();
    });
};
