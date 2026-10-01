// ============================================================================
// Config from the query string.  ?size=552 gives a 5 x 5 x 2 board, digits
// mapping to s[0]=x extent, s[1]=y extent, s[2]=z extent.  Default 3 x 2 x 2.
// ============================================================================
var args = {};
var query = window.location.search.substring(1).split("&");
for (var i = 0, max = query.length; i < max; i++) {
    if (query[i] === "")
        // check for trailing & with no param
        continue;
    var param = query[i].split("=");
    args[decodeURIComponent(param[0])] = decodeURIComponent(param[1] || "");
}
var s = [3, 2, 2];
if (args["size"] !== undefined) {
    var n = parseInt(args["size"]) % 1000;
    if (n >= 200)
        s[0] = Math.floor(n / 100);
    n = n % 100;
    if (n >= 10)
        s[1] = Math.floor(n / 10);
    n = n % 10;
    if (n >= 1)
        s[2] = n;
}
// Strides into the flat board array: [x, y, z, cellCount].
var dirs = [1, s[0], s[0] * s[1], s[0] * s[1] * s[2]];

// ============================================================================
// Board state.  Two buffers are used: board[cur] is live, board[other] is the
// scratch target that calculateBoard writes into.
// Each cell is null, or {v: exponent, i: index into the data row for that
// exponent} -- the pair is how a tile remembers which label to draw.
// data[] holds one row per exponent: [value, HTML for powers-of-2, HTML for
// long form].  2048fix.html swaps this array when you pick a different unit set.
// ============================================================================
var dead = false;
var board;
var cur = 0;
var data = [];
for (var i = 0, value = 1, stvalue = "1"; i < 11; i++) {
    data.push([value, "2<sup>" + (i) + "</sup>", "<span>" + stvalue + "<sub>2</sub></span>"]);
    value *= 2;
    stvalue = stvalue + "0";
}
// Cached 3D resources, built on first use and shared by every tile.
var tileGeo = null, labels = [], lights = null;

// ============================================================================
// Rules
// ============================================================================
function newB() {
    var b = [];
    for (var i = 0; i < dirs[3]; i++) {
        b.push(null);
    }
    return b;
}
function addNew(board) {
    // place an entry in the table if possible
    var out = (Math.random() > 0.1) ? 1 : 2;
    var indices = [];
    for (var i = 0; i < board.length; i++) {
        if (board[i] == null)
            indices.push(i);
    }
    if (indices.length == 0)
        return false;
    board[indices[Math.floor(Math.random() * indices.length)]] = {
        "v": out,
        "i": Math.floor(Math.random() * data[out].length)
    };
    return true;
}
function calculateBoard(index, dir) {
    // Slides every line along one axis into board[other].  index selects the
    // axis (0,1,2) and dir is +1 for increasing and -1 for decreasing.
    var other = (cur + 1) % 2;
    board[other] = newB();
    var d1 = (index + 1) % s.length;
    //the first non dir
    var d2 = (index + 2) % s.length;
    //the second non dir
    for (var i = 0; i < s[d1]; i++) {
        for (var j = 0; j < s[d2]; j++) {
            var base = i * dirs[d1] + j * dirs[d2];
            var col = [];
            var coln = [];
            // gather one line of tiles, then drop the gaps
            for (var k = 0; k < s[index]; k++) {
                col.push(board[cur][base + k * dirs[index]]);
            }
            col = col.filter(a => a !== null);
            if (dir == 1) {
                //down
                for (var k = 0; k < col.length; k++) {
                    if ((k + 1) < col.length && col[k]["v"] == col[k + 1]["v"]) {
                        var ii = col[k]["v"] + 1;
                        coln.push({
                            "v": ii,
                            "i": Math.floor(Math.random() * data[ii].length)
                        });
                        k++;
                    } else {
                        coln.push(col[k]);
                    }
                }
                for (var k = 0; k < coln.length; k++) {
                    board[other][base + k * dirs[index]] = coln[k];
                }
            } else {
                //up
                for (var k = col.length - 1; k >= 0; k--) {
                    if (k > 0 && col[k - 1]["v"] == col[k]["v"]) {
                        var ii = col[k]["v"] + 1;
                        coln.push({
                            "v": ii,
                            "i": Math.floor(Math.random() * data[ii].length)
                        });
                        k--;
                    } else {
                        coln.push(col[k]);
                    }
                }
                // the line was gathered in reverse, so write it back reversed
                for (var k = coln.length - 1; k >= 0; k--) {
                    board[other][base + (s[index] - 1 - k) * dirs[index]] = coln[k];
                }
            }
        }
    }
    return board[other];
}
function doMove(index, dir) {
    // index is the (0,1,2)
    var other = (cur + 1) % 2;
    calculateBoard(index, dir);
    cur = other;
    // check() is false when the move was a no-op, i.e. the two buffers match
    if (!check()) {
        if (!addNew(board[cur])) {
            //no space for a new one
            dead = true;
        }
        if (isDead()) {
            dead = true;
        }
    }
    createBoard(board[cur]);
    animate();
}
function check() {
    for (var i = 0; i < board[0].length; i++) {
        if (board[0][i] != board[1][i]) {
            return false;
        }
    }
    return true;
}
function isDead() {
    //go through all directions
    for (var i = 0; i < 6; i++) {
        calculateBoard(Math.floor(i / 2), (i % 2) * 2 - 1);
        if (!check())
            return false;
    }
    return true;
}
function restart() {
    board = [newB(), newB()];
    cur = 0;
    for (var k = 0; k < 3; k++) {
        addNew(board[cur]);
    }
}
function rerestart() {
    restart();
    dead = false;
    createBoard(board[cur]);
    animate();
}

// ============================================================================
// UI wiring.  index 0/1/2 is x/y/z; the buttons cover both directions per axis.
// ============================================================================
function initApp() {
    restart();
    init(document.getElementById("map"));
    animate();
    document.getElementById("go").addEventListener("click", function() {
        rerestart();
    });
    document.getElementById("a1").addEventListener("click", function() {
        doMove(0, 1);
    });
    document.getElementById("a2").addEventListener("click", function() {
        doMove(1, -1);
    });
    document.getElementById("a3").addEventListener("click", function() {
        doMove(2, 1);
    });
    document.getElementById("a1n").addEventListener("click", function() {
        doMove(0, -1);
    });
    document.getElementById("a2n").addEventListener("click", function() {
        doMove(1, 1);
    });
    document.getElementById("a3n").addEventListener("click", function() {
        doMove(2, -1);
    });
    document.body.addEventListener("keypress", function(event) {
        if (event.keyCode == 83 || event.keyCode == 101) {
            doMove(2, -1);
        } else if (event.keyCode == 87 || event.keyCode == 114) {
            doMove(2, 1);
        } else if (event.keyCode == 115) {
            doMove(1, 1);
        } else if (event.keyCode == 119) {
            doMove(1, -1);
        } else if (event.keyCode == 65 || event.keyCode == 97) {
            doMove(0, 1);
        } else if (event.keyCode == 68 || event.keyCode == 100) {
            doMove(0, -1);
        }
    });
}

// ============================================================================
// three.js setup.  Two renderers share the #pic element: a WebGL layer for the
// cubes and a CSS3D layer for the numbers, both drawn with the same camera.
// ============================================================================
var camera, scene, renderer;
var scene2, renderer2;
var texture1, material1;
var controls;
var wireframe;
function init(doc) {
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 2500);
    camera.position.set(250, 250, 650);
    controls = new THREE.TrackballControls(camera, doc);

    // board outline, one segment per cell, kept in every rebuilt scene
    var geometry = new THREE.BoxGeometry(100 * s[0], 100 * s[1], 100 * s[2]);
    var geo = new THREE.EdgesGeometry(geometry);
    var mat = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        linewidth: 2
    });
    wireframe = new THREE.LineSegments(geo, mat);

    var picEl = document.getElementById("pic");
    var picSizeW = parseFloat(getComputedStyle(picEl).width);
    var picSizeH = parseFloat(getComputedStyle(picEl).height);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(picSizeW, picSizeH);
    texture1 = new THREE.TextureLoader().load("images/colour.jpg");

    renderer2 = new THREE.CSS3DRenderer();
    picEl.appendChild(renderer.domElement);
    renderer2.setSize(picSizeW, picSizeH);
    renderer2.domElement.style.position = 'absolute';
    renderer2.domElement.style.top = 0;
    picEl.appendChild(renderer2.domElement);

    // the CSS3D scene and its label pool are built once and never rebuilt
    scene2 = new THREE.Scene();
    buildLabels();
    createBoard(board[cur]);
}

// ============================================================================
// Shared 3D resources.  createBoard runs on every move, so nothing expensive
// may be allocated inside it -- each of these is built once and reused.
// ============================================================================
function tileMaterial() {
    if (material1 == null) {
        material1 = new THREE.MeshLambertMaterial({
            map: texture1
        });
        material1.transparent = true;
        material1.opacity = 0.55;
        // min-style blend so the cubes read as translucent over the background
        material1.blending = THREE["CustomBlending"];
        material1.blendSrc = THREE["SrcAlphaFactor"];
        material1.blendDst = THREE["SrcAlphaFactor"];
        material1.blendEquation = THREE.AddEquation;
    }
    return material1;
}
function tileGeometry() {
    if (tileGeo == null)
        tileGeo = boxUV(createBoxWithRoundedEdges(90, 90, 90, 40, 15));
    return tileGeo;
}
function boardLights() {
    // three.js r160 uses physically correct lighting, so intensity is in
    // candela and falls off as 1/d^2.  250000 is roughly d^2 for d = 500, which
    // puts a lit face at about unit irradiance.
    if (lights == null) {
        lights = [];
        lights[0] = new THREE.PointLight(0xffffff, 250000, 0);
        lights[1] = new THREE.PointLight(0xffffff, 250000, 0);
        lights[2] = new THREE.PointLight(0xffffff, 250000, 0);
        lights[0].position.set(0, 400, 0);
        lights[1].position.set(300, 500, 300);
        lights[2].position.set(-300, -500, 0);
    }
    return lights;
}
function buildLabels() {
    // One CSS3DObject per cell, positioned once since the grid never moves.
    // Later moves only rewrite the text and flip .visible, which
    // CSS3DRenderer turns into display:none.
    for (var k = 0; k < dirs[3]; k++) {
        var element = document.createElement("div");
        element.className = "el";
        var details = document.createElement("div");
        details.className = "details";
        element.appendChild(details);
        var object = new THREE.CSS3DObject(element);
        object.position.x = (k % dirs[1]) * 100 - 50 * (s[0] - 1);
        object.position.y = Math.floor((k % dirs[2]) / dirs[1]) * 100 - 50 * (s[1] - 1);
        object.position.z = Math.floor(k / dirs[2]) * 100 - 50 * (s[2] - 1);
        object.visible = false;
        object.label = details;
        scene2.add(object);
        labels.push(object);
    }
}

// ============================================================================
// Scene construction.  The WebGL scene is rebuilt from scratch each move, but
// every object in it points at a shared geometry and material.
// ============================================================================
function createBoard(board) {
    var scen = new THREE.Scene();
    scen.background = new THREE.Color(0xf0f0f0);
    scen.add(wireframe);
    scen.add(new THREE.AmbientLight(0x000000));
    var ls = boardLights();
    scen.add(ls[0]);
    scen.add(ls[1]);
    scen.add(ls[2]);

    var geo = tileGeometry();
    var mat = tileMaterial();

    for (var i = 0; i < board.length; i++) {
        if (board[i] != null) {
            var px = (i % dirs[1]) * 100 - 50 * (s[0] - 1);
            var py = Math.floor((i % dirs[2]) / dirs[1]) * 100 - 50 * (s[1] - 1);
            var pz = Math.floor(i / dirs[2]) * 100 - 50 * (s[2] - 1);

            labels[i].label.innerHTML = '<h3>' + (board[i]["v"] < data.length ? data[board[i]["v"]][board[i]["i"]] : "done") + '</h3>';
            labels[i].visible = true;

            var wirefram = new THREE.Mesh(geo, mat);
            wirefram.position.set(px, py, pz);
            scen.add(wirefram);
        } else {
            labels[i].visible = false;
        }
    }

    scene = scen;
}

// ============================================================================
// Render loop.  Draws the cubes, then billboards every visible label to face
// the camera and draws the CSS3D layer on top.
// ============================================================================
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (dead)
        scene.background = new THREE.Color(0xffa0a0);
    renderer.render(scene, camera);
    var qq = camera.quaternion.clone();
    camera.position.set(250, 250 + Math.floor(20 * Math.cos((new Date().getTime()) / 1000)), 650);

    var ch = scene2.children;
    for (var i = 0; i < ch.length; i++) {
        ch[i].rotation.setFromQuaternion(qq);
    }
    renderer2.render(scene2, camera);
}

// ============================================================================
// Geometry helpers
// ============================================================================

//**  from https://jsfiddle.net/prisoner849/ss99Lsph/
// round-edged box.  The corner arcs use eps as their radius, so the profile is
// effectively a sharp-cornered square and all the rounding comes from the
// extrude bevel.  The result is exactly width x height x depth, centred.
function createBoxWithRoundedEdges(width, height, depth, radius0, smoothness) {
    let shape = new THREE.Shape();
    let eps = 0.00001;
    let radius = radius0 - eps;
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, height - radius * 2, eps, Math.PI, Math.PI / 2, true);
    shape.absarc(width - radius * 2, height - radius * 2, eps, Math.PI / 2, 0, true);
    shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true);
    let geometry = new THREE.ExtrudeGeometry(shape, {
        amount: depth - radius0 * 2,
        bevelEnabled: true,
        bevelSegments: smoothness * 2,
        steps: 1,
        bevelSize: radius,
        bevelThickness: radius0,
        curveSegments: smoothness
    });

    geometry.center();

    return geometry;
}

// Replaces ExtrudeGeometry's world-space UVs with a per-vertex box projection
// so the texture lands as exactly one copy per face regardless of the box size.
// Without this, WorldUVGenerator emits UVs in model units (0..90 for a 90-unit
// cube), which the texture's repeat factor then has to be tuned against.
function boxUV(geo) {
    geo.computeBoundingBox();
    var pos = geo.attributes.position, nor = geo.attributes.normal, uv = geo.attributes.uv;
    var mn = [geo.boundingBox.min.x, geo.boundingBox.min.y, geo.boundingBox.min.z];
    var ex = [geo.boundingBox.max.x - mn[0], geo.boundingBox.max.y - mn[1], geo.boundingBox.max.z - mn[2]];
    var p = [0, 0, 0], n = [0, 0, 0], ua, va;
    for (var i = 0; i < pos.count; i++) {
        p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
        n[0] = Math.abs(nor.getX(i)); n[1] = Math.abs(nor.getY(i)); n[2] = Math.abs(nor.getZ(i));
        if (n[0] >= n[1] && n[0] >= n[2]) { ua = 2; va = 1; }
        else if (n[1] >= n[2]) { ua = 0; va = 2; }
        else { ua = 0; va = 1; }
        uv.setXY(i, (p[ua] - mn[ua]) / ex[ua], (p[va] - mn[va]) / ex[va]);
    }
    uv.needsUpdate = true;
    return geo;
}

// ============================================================================
// Bootstrap.  This must stay last: every var above has to be assigned before
// initApp() runs, and on the non-"loading" path it runs synchronously.
// ============================================================================
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
