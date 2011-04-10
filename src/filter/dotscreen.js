function DotScreenFilter() {
    this.shader = new Shader(null, '\
        uniform sampler2D texture;\
        uniform float angle;\
        uniform float size;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec3 color = texture2D(texture, texCoord).rgb;\
            float s = sin(angle), c = cos(angle);\
            vec2 tex = texCoord * texSize;\
            vec2 point = vec2(\
                c * tex.x - s * tex.y,\
                s * tex.x + c * tex.y\
            ) * size;\
            float weight = (sin(point.x) * sin(point.y)) * 2.0;\
            float average = (color.r + color.g + color.b) / 3.0;\
            color = vec3(average + (average - 0.6) * 4.0 + weight);\
            gl_FragColor = vec4(color, 1.0);\
        }\
    ');

    slider(this, 'Angle', -1, 1, 0.5, 0.02, function(value) {
        this.angle = value;
    });
    slider(this, 'Size', 0, 1, 0.75, 0.02, function(value) {
        this.size = value;
    });
}

DotScreenFilter.prototype.name = 'Dot Screen';

DotScreenFilter.prototype.drawTo = function(original, texture) {
    var this_ = this;
    texture.drawTo(function() {
        original.use();
        this_.shader.uniforms({
            angle: this_.angle,
            size: this_.size,
            texSize: [original.width, original.height]
        }).drawRect();
    });
};
