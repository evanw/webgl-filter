function SwirlFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float radius;\
        uniform float angle;\
        uniform vec2 center;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 coord = texCoord * texSize;\
            coord -= center;\
            float distance = length(coord);\
            if (distance < radius) {\
                float percent = (radius - distance) / radius;\
                float theta = percent * percent * angle * 8.0;\
                float s = sin(theta);\
                float c = cos(theta);\
                coord = vec2(\
                    dot(coord, vec2(c, -s)),\
                    dot(coord, vec2(s, c))\
                );\
            }\
            coord += center;\
            vec3 color = texture2D(texture, coord / texSize).rgb;\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Swirl Angle', -1, 1, 0.5, 0.01, function(value) {
        this.angle = value;
    });
    slider(this, 'Swirl Radius', 0, 800, 400, 5, function(value) {
        this.radius = value;
    });

    this.center = [0.5, 0.5];
    marker(this, function(x, y) {
        this.center = [x / original.width, y / original.height];
    });
}

SwirlFilter.prototype.name = 'Swirl';

SwirlFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            center: [this_.center[0] * original.width, this_.center[1] * original.height],
            radius: this_.radius,
            angle: this_.angle,
            texSize: [original.width, original.height]
        }).drawRect();
    });
};
