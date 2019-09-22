function $(id) {
    return document.getElementById(id);
}

function $$(cname) {
    return [ ...(document.getElementsByClassName(cname)) ];
}

const simu = {
    fig: {
        S: 300,
        ox: 0.5, oy: 0.1,
        r1: 20, r2: 30,
    },
    grid: {
        S: 300,
    },
    point: {
        R: 5,
    },
    // NOTE: all labelling starts from base
    // aX is the 2-part arm closer to load
    // bX is 3-part arm supporting it
    arms: {
        a1: 0.6,
        a2: 0.5,
        b1: 0.3,
        b2: 0.4,
        b3: 0.2,
    }
};

// NOTE: utils funcs
function setSvg(obj, key, val) {
    obj.setAttributeNS(null, key, val);
}

function figX(x) {
    return (x + simu.fig.ox) * simu.fig.S;
}

function figY(y) {
    return (1-(y + simu.fig.oy)) * simu.fig.S;
}

// NOTE: drawing funcs
function posGrid(div, x, y) {
    // NOTE: X & Y = [0, 1] proportion of W, H
    div.style.top = (y * simu.grid.S) - simu.point.R;
    div.style.left = (x * simu.grid.S) - simu.point.R;
}

function posFigLine(div, A, B) {
    setSvg(div, 'x1', figX(A[0]));
    setSvg(div, 'y1', figY(A[1]));
    setSvg(div, 'x2', figX(B[0]));
    setSvg(div, 'y2', figY(B[1]));
}

function posFigCircle(div, radius, angle) {
    const dx = radius * Math.cos(angle);
    const dy = radius * Math.sin(angle);

    const path = [];
    path.push(`M ${figX(0)} ${figY(0)}`);
    path.push(`L ${figX(0)+radius} ${figY(0)}`);
    path.push(`A ${radius} ${radius} 0 0 0 ${figX(0)+dx} ${figY(0)-dy}`);

    setSvg(div, 'd', path.join(' '));
}

function init() {
    const gridCnt = 10;
    const table = $('lines');

    for (i=0; i<gridCnt; i++) {
        const tr = document.createElement('tr');

        for (j=0; j<gridCnt; j++) {
            tr.appendChild(document.createElement('td'));
        }

        table.appendChild(tr);
    }

    $('grid').style.width = simu.grid.S;
    $('grid').style.height = simu.grid.S;

    $$('point').forEach(div => {
        div.style.width = simu.point.R*2;
        div.style.height = simu.point.R*2;
        posGrid(div, 0.5, 0.5);
    });

    $('figure').style.width = simu.fig.S*1.5;
    $('figure').style.height = simu.fig.S;

    Object.keys(simu.arms).forEach(key => {
        const row = document.createElement('div');
        row.className = 'row';

        const subtitle = document.createElement('div');
        subtitle.className = 'subtitle';
        subtitle.textContent = key;
        row.appendChild(subtitle);

        const input = document.createElement('input');
        input.id = 'settings-'+key;
        input.name = key;
        input.value = simu.arms[key];
        row.appendChild(input);

        $('settings').appendChild(row);
    });

    const btn = document.createElement('button');
    btn.onclick = refreshSettings;
    btn.textContent = 'update arm lengths';
    $('settings').appendChild(btn);

    move();
}

function move() {
    function val(key) {
        return parseInt($('ctrl'+key).value)/100;
    }
    update(val('x'), val('y'), val('z'));
}

// NOTE: X, Y from [-1, 1]
function update(x, y, z) {
    function getXY(origin, dist, angle) {
        return [
            origin[0] + (Math.cos(angle) * dist),
            origin[1] + (Math.sin(angle) * dist)];
    }

    function getDiff(A, B) {
        return [
            B[0] - A[0],
            B[1] - A[1]
        ];
    }

    function getDist(A, B) {
        const [dx, dy] = getDiff(A, B);
        return Math.sqrt(dx*dx + dy*dy);
    }

    function extend(origin, end, dist) {
        const [dx, dy] = getDiff(origin, end);
        const mul = dist / Math.sqrt(dx*dx + dy*dy);

        return [end[0] + mul*dx, end[1] + mul*dy];
    }

    function getAngleC(A, B, C) {
        return Math.acos(((A*A) + (B*B) - (C*C))/(2*A*B));
    }

    function toDeg(rad) {
        return rad*180/Math.PI;
    }

    function doError() {
        $('error').innerText = 'Position out of range';
    }
    $('error').innerText = '';

    // NOTE: points A, B, C, D, E
    // labelled starting from base in clockwise dir
    const {
        a1: AD,
        a2: DE,
        b1: AB,
        b2: BC,
        b3: CD,
    } = simu.arms;

    const A = [0, 0];
    const E = [Math.sqrt(x*x + y*y), z];

    const AE = Math.sqrt(x*x + y*y + z*z);
    if (AE > AD+DE) { return doError(); }

    const DAE = getAngleC(AD, AE, DE);
    const angle1 = DAE + Math.asin(z/AE);

    const D = getXY(A, AD, angle1);
    const C = extend(E, D, CD);

    const AC = getDist(A, C);
    if (AC > AB+BC) { return doError(); }

    const CAD = getAngleC(AC, AD, CD);
    const BAC = getAngleC(AB, AC, BC);

    const angle2 = angle1 + CAD + BAC;
    const B = getXY(A, AB, angle2);

    posGrid($('target'), (x+1)/2, (y+1)/2);

    posFigLine($('a1'), A, D);
    posFigLine($('a2'), D, E);
    posFigLine($('b1'), A, B);
    posFigLine($('b2'), B, C);
    posFigLine($('b3'), C, D);

    posFigCircle($('angle1'), simu.fig.r1, angle1);
    posFigCircle($('angle2'), simu.fig.r2, angle2);

    const angle3 = Math.atan(y/x);
    $('val-angle1').innerText = toDeg(angle1).toFixed(2);
    $('val-angle2').innerText = toDeg(angle2).toFixed(2);
    $('val-angle3').innerText = toDeg(angle3).toFixed(2);
}

function refreshSettings() {
    Object.keys(simu.arms).forEach(key => {
        simu.arms[key] = parseFloat($('settings-'+key).value);
    });
    move();
}
