// this is to change the default size of the board  ?size=552 for instance
var args = {};
var query = window.location.search.substring(1).split("&");
for (var i = 0, max = query.length; i < max; i++) {
    if (query[i] === "")
        // check for trailing & with no param
        continue;
    var param = query[i].split("=");
    args[decodeURIComponent(param[0])] = decodeURIComponent(param[1] || "");
    console.log(args[decodeURIComponent(param[0])] + " " + decodeURIComponent(param[0]));
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
//console.log(args + " " + s);
var dirs = [1, s[0], s[0] * s[1], s[0] * s[1] * s[2]];
// begin
function newB() {
    var b = [];
    for (var i = 0; i < dirs[3]; i++) {
        b.push(null);
    }
    return b;
}
function pickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function text(board) {
    var out = "[";
    for (var i = 0; i < board.length; i++) {
        out += "<" + board[i]["v"] + board[i]["i"] + ">";
    }
    return out + "]";
}
function display(board) {
    var out = "";
    for (var i = 0; i < board.length; i++) {
        if (board[i] != null)
            out += "<div class='p" + board[i] + "'>" + board[i]["v"] + "</div>" + (((i + 1) % dirs[1] == 0) ? "<br/>" : "") + (((i + 1) % dirs[2] == 0) ? "<br/>" : "");
    }
    return out;
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
    var other = (cur + 1) % 2;
    board[other] = newB();
    //fix later....
    var d1 = (index + 1) % s.length;
    //the first non dir
    var d2 = (index + 2) % s.length;
    //the second non dir
    for (var i = 0; i < s[d1]; i++) {
        for (var j = 0; j < s[d2]; j++) {
            var out = "-";
            var base = i * dirs[d1] + j * dirs[d2];
            var col = [];
            var coln = [];
            for (var k = 0; k < s[index]; k++) {
                out += (base + k * dirs[index]) + ".";
                col.push(board[cur][base + k * dirs[index]]);
            }
            col = col.filter(a=>a !== null);
            //does this work?
            //console.log("X" + JSON.stringify(col[0]));
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
                var junk = 1;
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
    //console.log("other "+other);
    //console.log("board "+board);
    calculateBoard(index, dir);
    cur = other;
    if (!check()) {
        if (!addNew(board[cur])) {
            //no space for a new one
            // have to check again if there are any moves with this new configuration...
            // cur = (cur+1)%2;
            dead = true;
            //restart();
        } else if (isDead()) {
            dead = true;
        }
        if (isDead()) {
            dead = true;
        }
    } else {//console.log("didn't work");           
    }
    document.getElementById("map").innerHTML = "";
    document.getElementById("map").innerHTML = display(board[cur]);
    createBoard(board[cur]);
    animate();
}
function check() {
    for (var i = 0; i < board[0].length; i++) {
        if (board[0][i] != board[1][i]) {
            //console.log(i+" .huh. "+board[cur][i]);
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
    //for (var k = 0; k < board[cur].length / 2; k++) {
    for (var k = 0; k < 3; k++) {
        addNew(board[cur]);
    }
    //$("#map").empty();
    //$("#map").append(display(board[cur]));
}
function rerestart() {
    restart();
    //$("body").css("background", "white");
    dead = false;
    //if (!addNew(board[cur])) {// cur = (cur+1)%2;
    //$("body").css("background","yellow");
    //}
    createBoard(board[cur]);
    animate();
}
// ------------------------------------------------------
var dead = false;
var board;
var cur = 0;
var data = [];
var value = 1;
var stvalue = "1";
for (var i = 0; i < 11; i++) {
    data.push([value, "2<sup>" + (i) + "</sup>", "<span>" + stvalue + "<sub>2</sub></span>"]);
    //data.push([value,"2^"+(i)]);
    value *= 2;
    stvalue = stvalue + "0";
}
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
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
// will fix this eventually

var camera, scene, renderer;
var scene2, renderer2;
var texture1, textureLoader, material1;
var controls;
var geometryC, materialC, matC, wireframe;
function init(doc) {
    camera = new THREE.PerspectiveCamera(45,window.innerWidth / window.innerHeight,1,2500);
    camera.position.set(250, 250, 650);
    controls = new THREE.TrackballControls(camera,doc);
    var material = new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: true,
        wireframeLinewidth: 1,
        side: THREE.DoubleSide
    });
    //
    var geometry = new THREE.BoxGeometry(100 * s[0],100 * s[1],100 * s[2]);
    material = new THREE.MeshBasicMaterial({
        color: 0xaaaa88,
        opacity: 0.05
    });

    var frame = new THREE.Mesh(geometry,material);
    frame.opacity = 0.1;
    var geo = new THREE.EdgesGeometry(geometry);
    var mat = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        linewidth: 2
    });
    wireframe = new THREE.LineSegments(geo,mat);
    wireframe.rotation.x = 0;
    wireframe.rotation.y = 0;
    wireframe.rotation.z = 0;
    //scene.add(wireframe);
    //changing...
    //scene2 = new THREE.Scene();
    var picEl = document.getElementById("pic");
    var picSizeW = parseFloat(getComputedStyle(picEl).width);
    var picSizeH = parseFloat(getComputedStyle(picEl).height);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(picSizeW, picSizeH);
    textureLoader = new THREE.TextureLoader();
    texture1 = textureLoader.load("images/colour.jpg");
    texture1.repeat.set(.010, .010);
    texture1.wrapS = THREE.RepeatWrapping;
    texture1.wrapT = THREE.RepeatWrapping;

    material1 = new THREE.MeshBasicMaterial({
        color: 0xaaaa88,
        opacity: 0.05
    });

    picEl.appendChild(renderer.domElement);
    renderer2 = new THREE.CSS3DRenderer();
    picEl.appendChild(renderer.domElement);
    renderer2.setSize(picSizeW, picSizeH);
    renderer2.domElement.style.position = 'absolute';
    renderer2.domElement.style.top = 0;
    picEl.appendChild(renderer2.domElement);
    geometryC = new THREE.BoxGeometry(90,90,90);
    materialC = new THREE.MeshBasicMaterial({
        color: 0xaaaa88,
        opacity: 0.05
    });
    matC = new THREE.LineBasicMaterial({
        color: 0x888888,
        linewidth: 1
    });
    
    //controls = new THREE.TrackballControls(camera,renderer2);   //!!!nov2019

    createBoard(board[cur]);
}
function createBoard(board) {
    //material1 = new THREE.MeshPhongMaterial( { map: texture1} );
    material1 = new THREE.MeshLambertMaterial({
        map: texture1
    });
    material1.transparent = true;
    material1.opacity = 0.55;
    //material1.transparent = true;

    material1.blending = THREE["CustomBlending"];
    material1.blendSrc = THREE["SrcAlphaFactor"];
    material1.blendDst = THREE["SrcAlphaFactor"];
    material1.blendEquation = THREE.AddEquation;
    //texture1.wrapS = texture1.wrapT = THREE.RepeatWrapping;
    //texture1.matrixAutoUpdate = false; // set this to false to update texture.matrix manually

    // this will from the data make the cubes....soon
    var scen = new THREE.Scene();
    scen.background = new THREE.Color(0xf0f0f0);
    scen.add(wireframe);
    var scen2 = new THREE.Scene();
    document.querySelectorAll(".el").forEach(function(el) { el.remove(); });
    
    for (var i = 0; i < board.length; i++) {
        if (board[i] != null) {
            var element = document.createElement("div");
            element.className = "el";
            var details = document.createElement("div");
            details.className = "details";
            details.innerHTML = '<h3>' + (board[i]["v"] < data.length ? data[board[i]["v"]][board[i]["i"]] : "done") + '</h3>';
            element.appendChild(details);
            var geometry;
            var object = new THREE.CSS3DObject(element);
            object.position.x = (i % dirs[1]) * 100 - 50 * (s[0] - 1);
            object.position.y = Math.floor((i % dirs[2]) / dirs[1]) * 100 - 50 * (s[1] - 1);
            object.position.z = Math.floor(i / dirs[2]) * 100 - 50 * (s[2] - 1);
            scen2.add(object);

            //var cube = new THREE.Mesh(geometryC, materialC);
            //var geo = new THREE.EdgesGeometry(geometryC);
            //var wirefram = new THREE.LineSegments(geo, matC);
            var geo = createBoxWithRoundedEdges(90, 90, 90, 15, 10);
            //var wirefram = new THREE.LineSegments(geo, materialC);
            //var materialb = new THREE.MeshLambertMaterial( { color: 0xb00000, wireframe: false } );

            var wirefram = new THREE.Mesh(geo,material1);
            //wirefram.position.copy(object.position);
            //wirefram.rotation.copy(object.rotation);
            wirefram.position.x = (i % dirs[1]) * 100 - 50 * (s[0] - 1);
            wirefram.position.y = Math.floor((i % dirs[2]) / dirs[1]) * 100 - 50 * (s[1] - 1);
            wirefram.position.z = Math.floor(i / dirs[2]) * 100 - 50 * (s[2] - 1);
            scen.add(wirefram);
        }
    }

    //eraseScene(scene2,true,"text");
    eraseScene(scene,false,"graphics");
    scene = scen;
    scene2 = scen2;
    var ambientLight = new THREE.AmbientLight(0x000000);
    scene.add(ambientLight);

    var lights = [];
    lights[0] = new THREE.PointLight(0xffffff,1,0);
    lights[1] = new THREE.PointLight(0xffffff,1,0);
    lights[2] = new THREE.PointLight(0xffffff,1,0);

    lights[0].position.set(0, 400, 0);
    lights[1].position.set(300, 500, 300);
    lights[2].position.set(-300, -500, 0);

    scene.add(lights[0]);
    scene.add(lights[1]);
    scene.add(lights[2]);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    if (dead)
        scene.background = new THREE.Color(0xffa0a0);
    renderer.render(scene, camera);
    var qq = camera.quaternion.clone();
        camera.position.set(250, 250+Math.floor(20*Math.cos((new Date().getTime())/1000)), 650);

    var ch = scene2.children;
    for (var i = 0; i < ch.length; i++) {
        ch[i].rotation.setFromQuaternion(qq);
    }
    renderer2.render(scene2, camera);
}

//**  from https://jsfiddle.net/prisoner849/ss99Lsph/
// round-edged box
function createBoxWithRoundedEdges(width, height, depth, radius0, smoothness) {
    let shape = new THREE.Shape();
    let eps = 0.00001;
    let radius = radius0 - eps;
    shape.absarc(eps, eps, eps, -Math.PI / 2, -Math.PI, true);
    shape.absarc(eps, height - radius * 2, eps, Math.PI, Math.PI / 2, true);
    shape.absarc(width - radius * 2, height - radius * 2, eps, Math.PI / 2, 0, true);
    shape.absarc(width - radius * 2, eps, eps, 0, -Math.PI / 2, true);
    let geometry = new THREE.ExtrudeBufferGeometry(shape,{
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

// memory issues
function eraseScene(eraseSc,all,mess) {
    if (eraseSc==null) return;
    var rid = eraseSc.children;

    for (var i = rid.length-1;i>=0;i--){
        console.log(mess+" "+rid[i].name+rid[i].id);
        if (typeof rid[i] == THREE.CSS3DObject) console.log("bingo");
        try { // statements to try
	        if (rid[i].isMesh && rid[i] != wireframe || typeof rid[i] == THREE.CSS3DObject || all) {
	          rid[i].geometry.dispose();
	          rid[i].material.dispose();
                   console.log("disposed");
	        }       
	}
	catch (e) {
	  console.log(i+".. "+rid[i].isLight+" "+e); // pass exception object to error handler -> your own function
	}
    }
}