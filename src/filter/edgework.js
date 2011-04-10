function EdgeWorkFilter() {
    this.firstShader = new Shader(null, '\
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
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec3 sample = texture2D(texture, texCoord + delta * percent * radius).rgb;\
                float average = (sample.r + sample.g + sample.b) / 3.0;\
                color.x += average * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += average * weight;\
                    total.y += weight;\
                }\
            }\
            gl_FragColor = vec4(color / total, 0.0, 1.0);\
        }\
    ');
    this.secondShader = new Shader(null, '\
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
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec2 sample = texture2D(texture, texCoord + delta * percent * radius).xy;\
                color.x += sample.x * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += sample.y * weight;\
                    total.y += weight;\
                }\
            }\
            float c = 1000.0 * (color.y / total.y - color.x / total.x) + 0.5;\
            gl_FragColor = vec4(c, c, c, 1.0);\
        }\
    ');

    slider(this, 'Radius', 0, 100, 15, 1, function(value) {
        this.radius = value;
    });

    this.tempTexture = null;
}

EdgeWorkFilter.prototype.name = 'Edge Work';

EdgeWorkFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.firstShader.uniforms({
            delta: [1 / original.width, 0],
            radius: this_.radius
        }).drawRect();
    });
    texture.drawToUsingSelf(function() {
        texture.use();
        this_.secondShader.uniforms({
            delta: [0, 1 / original.height],
            radius: this_.radius
        }).drawRect();
    });
};
