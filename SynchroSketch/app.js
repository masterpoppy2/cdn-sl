//SynchroSketch-app.js
var path;
var path2;
var width = 4;
var pencolor = 'black';
var draw = true;
var debug = false;
var newpath;
var n = 15; //splineを分割送信するしきい値
var tool = 'tool1';
var toollast = 'tool1';
var pMouseDown;

var textItem = new PointText({
    // content: 'Click and drag to draw a line.',
    point: new Point(20, 30),
    fillColor: 'black'
});

var hitOptions = {
    segments: true,
    stroke: true,
    fill: true,
    tolerance: 5
};

function output(val) {
    if (debug) {
        textItem.content = val;
        console.log(val);
    }
}

function onMouseDown(event) {
    if (!draw) return;
    if (path) {
        path.selected = false;
    }
    if (tool == 'tool1') {
        path = new Path({
            segments: [event.point],
            strokeColor: pencolor,
            strokeWidth: width,
            fullySelected: false
        });
    } else if (tool == 'tool2') {
        path = new Path({
            segments: [event.point],
            strokeColor: pencolor,
            strokeWidth: width,
            fullySelected: false
        });
    } else if (tool == 'tool3') {
        pMouseDown = event.point;
        path = new Path.Ellipse(pMouseDown, pMouseDown);
    } else if (tool == 'tool4') {
        pMouseDown = event.point;
        path = new Path.Rectangle(pMouseDown, pMouseDown);
    }
}

function onMouseDrag(event) {
    if (draw) {
        if (tool == 'tool1') {
            path.add(event.point);
        } else if (tool == 'tool2') {
            path.removeSegment(1);
            path.add(event.point);
        } else if (tool == 'tool3') {
            path.remove();
            path = new Path.Ellipse(pMouseDown + (pMouseDown - event.point), event.point);
            path.strokeWidth = width;
            path.strokeColor = pencolor;
        } else if (tool == 'tool4') {
            path.remove();
            path = new Path.Rectangle(pMouseDown, event.point);
            path.strokeWidth = width;
            path.strokeColor = pencolor;
        }
    } else {
        erase(event.point);
    }
}

function onMouseUp(event) {
    if (draw) {
        if (tool == 'tool1') {
            path.simplify(10);
            if (n < path.segments.length) {
                split();
            } else {
                // output('single: '+path.exportJSON());
                $.ajax({
                    'type': 'POST',
                    'url': location.href,
                    'data': JSON.stringify({
                        'mode': 'update',
                        'data': path
                    })
                }).done();
            }
        } else if (tool == 'tool2') {
            $.ajax({
                'type': 'POST',
                'url': location.href,
                'data': JSON.stringify({
                    'mode': 'update',
                    'data': path
                })
            }).done();
        } else if (tool == 'tool3') {
            path.remove();
            path = new Path.Ellipse(pMouseDown + (pMouseDown - event.point), event.point);
            path.strokeWidth = width;
            path.strokeColor = pencolor;
            $.ajax({
                'type': 'POST',
                'url': location.href,
                'data': JSON.stringify({
                    'mode': 'update',
                    'data': path
                })
            }).done();
        } else if (tool == 'tool4') {
            path.remove();
            path = new Path.Rectangle(pMouseDown, event.point);
            path.strokeWidth = width;
            path.strokeColor = pencolor;
            $.ajax({
                'type': 'POST',
                'url': location.href,
                'data': JSON.stringify({
                    'mode': 'update',
                    'data': path
                })
            }).done();
        }
    }
}

function split() {
    if (n < path.segments.length) {
        var location = path.getNearestLocation(path.segments[n - 1].point);
        newpath = path.splitAt(location);
        $.ajax({
            'type': 'POST',
            'url': location.href,
            'data': JSON.stringify({
                'mode': 'update',
                'data': path
            })
        }).done(function(body) {
            output('inloop: ' + path.exportJSON());
            path = newpath;
            split();
        });
    } else {
        end();
    }
}

function sync(ary) {
    console.log(JSON.stringify(ary[0]));
    $.ajax({
        'type': 'POST',
        'url': location.href,
        'data': JSON.stringify({
            'mode': 'update',
            'data': ary[0]
        })
    }).done(function(body) {
        ary.shift();
        if(ary.length){
            sync(ary);
        }
    });
}

function end() {
    $.ajax({
        'type': 'POST',
        'url': location.href,
        'data': JSON.stringify({
            'mode': 'update',
            'data': path
        })
    }).done(function(body) {
        // output('lastloop: ' + path.exportJSON());
    }).fail(function(body) {
        // output('fail: ' + body.exportJSON());
    });
}

function erase(p) {
    var hitResult = project.hitTest(p, hitOptions);
    if (!hitResult) {
        return;
    }
    hitResult.item.remove();
    $.ajax({
        'type': 'POST',
        'url': location.href,
        'data': JSON.stringify({
            'mode': 'erase',
            'data': {
                'x': p.x,
                'y': p.y
            }
        })
    }).done();
}

function clearall() {
    project.clear();
    textItem = new PointText({
        content: '',
        point: new Point(20, 30)
    });
    if (debug) {
        $('#debug').empty();
    }
}

function update(ary) {
    path2 = new Path({
        strokeColor: pencolor,
        strokeWidth: width,
        fullySelected: false
    });
    path2.importJSON(ary);
}

function shareimg(img) {
    $.ajax({
        'type': 'POST',
        'url': location.href,
        'data': JSON.stringify({
            'mode': 'shareimg',
            'data': img
        })
    }).done();
}

function updateimg(img) {
    $('#canvas-1').css('background-image', img);
}

function request() {
    $.ajax({
        'type': 'POST',
        'url': location.href,
        'data': JSON.stringify({
            'mode': 'keepalive'
        })
    }).done(function(body) {
        var list = body.split(',');
        for (i = 0; i < list.length; i++) {
            // output(window.atob(list[i]));
            var value = $.parseJSON(window.atob(list[i]));
            var mode = value.mode;
            if (mode == 'clearall') {
                clearall();
            } else if (mode == 'erase') {
                var point = new Point(value.data.x, value.data.y);
                erase(point);
            } else if (mode == 'update') {
                update(value.data);
            } else if (mode == 'shareimg') {
                updateimg(value.data);
            }
        }
        request();
    }).fail(function(body) {
        if (body.status == 504) {
            request();
        }
    });
}

$(document).ready(function() {
    request();
}, false);

$(function() {

    $('[id^=tool]').on('click', function() {
        tool = $(this).attr('id');
        output('tool: ' + tool);
        $('[id^=tool]').removeClass('active');
        $('#erase').removeClass('active');
        $(this).addClass('active');
        draw = true;
    });

    $('#erase').on('click', function() {
        output('tool: erase');
        $('[id^=tool]').removeClass('active');
        $(this).addClass('active');
        toollast = tool;
        tool = '';
        draw = false;
    });

    $('[id^=width]').on('click', function() {
        var widthlist = {
            'width1': '2',
            'width2': '4',
            'width3': '6',
            'width4': '8'
        };
        width = widthlist[$(this).attr('id')];
        // output('width: ' + width);
        $('[id^=width]').removeClass('active');
        $(this).addClass('active');
        draw = true;
    });

    $('[id^=pen]').on('click', function() {
        var colorlist = {
            'pen1' : 'black',
            'pen2' : '#3f3f3f',
            'pen3' : '#7f7f7f',
            'pen4' : '#bfbfbf',
            'pen5' : 'white',
            'pen6' : '#ff0000',
            'pen7' : '#ff007f',
            'pen8' : '#ff00ff',
            'pen9' : '#7f00ff',
            'pen10': '#0000ff',
            'pen11': '#007fff',
            'pen12': '#00ffff',
            'pen13': '#00ff7f',
            'pen14': '#00ff00',
            'pen15': '#7fff00',
            'pen16': '#ffff00',
            'pen17': '#ff7f00'
        };
        if(draw){
            $('[id^=pen]').removeClass('active');
            $(this).addClass('active');
            output('color: ' + pencolor);
        }
        else{
            $('[id^=tool]').removeClass('active');
            $('#'+toollast).addClass('active)');
            tool = toollast;
            output('tool: ' + tool);
        }
        pencolor = colorlist[$(this).attr('id')];
        $('[id^=tool]').css('color', pencolor);
        draw = true;
    });

    $('#clear').on('click', function() {
        $('#clearall-ui').modal('show');
    });

    $('#clear0').on('click', function() {
        clearall();
        draw = true;
        $.ajax({
            'type': 'POST',
            'url': location.href,
            'data': JSON.stringify({
                'mode': 'clearall'
            })
        }).done();
    });

    $('#clear1').on('click', function() {
        $('#clearall-ui').modal('hide');
    });

    $('#image').on('click', function() {
        var url = $('#canvas-1').css('background-image');
        if (url != 'none') {
            $('#url').val(url.slice(5, -2));
        }
        $('#loadimg-ui').modal('show');
    });

    $('#loadimage0').on('click', function() {
        var url = $('#url').val();
        if (url) {
            url = 'url(' + url + ')';
            shareimg(url);
            $('#canvas-1').css('background-image', url);
            $('#loadimg-ui').modal('hide');
        }
    });
    $('#loadimage1').on('click', function() {
        shareimg('none');
        $('#url').val('');
        $('#canvas-1').css('background-image', 'none');
        $('#loadimg-ui').modal('hide');
    });

    $('#loadimage2').on('click', function() {
        $('#loadimage').modal('hide');
    });

    $('#window').on('click', function() {
        $.ajax({
            'type': 'POST',
            'url': location.href,
            'data': JSON.stringify({
                'mode': 'window'
            })
        }).done();
    });

    $('#quit').on('click', function() {
        $.ajax({
            'type': 'POST',
            'url': location.href,
            'data': JSON.stringify({
                'mode': 'quit'
            })
        }).done();
    });

    $('#save').on('click', function() {
        html2canvas(document.getElementById('canvas-1'), {
            onrendered: function(canvas) {
                var file = document.createElement('a');
                var imgData = canvas.toDataURL();
                file.href = imgData;
                file.target = '_blank';
                file.download = 'SynchroSketch.png';
                file.click();
            }
        });
    });

    $('#sync').on('click', function() {
        $('#sync-ui').modal('show');
    });

    $('#excute-sync').on('click', function() {
        var img = $('#canvas-1').css('background-image');
        //あとでsync()でobjectを消すのでconcat()で参照渡ししてオリジナルのsegmentsを残す
        var obj = project.activeLayer.children.concat();
        $.ajax({
            'type': 'POST',
            'url': location.href,
            'data': JSON.stringify({
                'mode': 'clearall'
            })
        }).done(function() {
                shareimg(img);
                sync(obj);
            }
        );
    });

    $('.ui.dropdown').dropdown({
        on: 'hover'
    });
    $('.ui.menu.bottom').popup({
        on: 'hover',
        popup: $('.fluid.popup')
    });
});
