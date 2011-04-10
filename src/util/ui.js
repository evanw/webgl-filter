var sliderTimeout;

function invalidate() {
    clearTimeout(sliderTimeout);
    sliderTimeout = setTimeout(drawGL, 10);
}

function slider(obj, name, min, max, value, step, callback) {
    var id = name.toLowerCase().replace(/ /g, '-');
    callback.call(obj, value);
    obj.sliderHTML = (obj.sliderHTML || '') + '<span class="slider-label">\
        ' + name + ':\
        <div class="slider" id="' + id + '-slider"></div>\
        <span id="' + id + '-label"></span>\
    </span>';

    var oldInitUI = obj.initUI;
    obj.initUI = function() {
        $('#' + id + '-label').html(value);
        $('#' + id + '-slider').slider({
            min: min,
            max: max,
            value: value,
            step: step,
            slide: function(event, ui) {
                callback.call(obj, ui.value);
                $('#' + id + '-label').html(ui.value);
                invalidate();
            }
        });
        callback.call(obj, value);
        if (oldInitUI) oldInitUI();
    };
}

function marker(obj, callback) {
    var id = ('' + Math.random()).substr(2);
    obj.markerHTML = (obj.markerHTML || '') + '\
        <div id="' + id + '" class="marker"><div></div></div>\
    ';

    var oldInitUI = obj.initUI;
    obj.initUI = function() {
        $('#' + id).draggable({
            drag: function(event, ui) {
                ui.position.left = Math.max(0, Math.min(ui.position.left, original.width));
                ui.position.top = Math.max(0, Math.min(ui.position.top, original.height));
                callback.call(obj, ui.position.left, ui.position.top);
                invalidate();
            }
        });
        callback.call(obj, original.width / 2, original.height / 2);
        if (oldInitUI) oldInitUI();
    };
}
