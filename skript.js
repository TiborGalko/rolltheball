var xmlDoc;

window.onload = function() {
    var xmlhttp = new XMLHttpRequest();

    xmlhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            xmlDoc = xmlhttp.responseXML;

            load();
        }
    };
    xmlhttp.open("GET", "rollTheBall.xml", true);
    xmlhttp.send();

    nastavitDatum();
    nastavitHighScore();
};


function skrytNapovedu() {
    var napoveda = document.getElementById("div_napoveda");

    napoveda.setAttribute("style","display: none");
}

function zobrazitNapovedu() {
    var napoveda = document.getElementById("div_napoveda");

    napoveda.setAttribute("style","display: block");
}

function nastavitDatum() {
    var spanDatum = document.getElementById("span_datum");
    var date = new Date();
    spanDatum.innerHTML = date.toLocaleDateString();
}

function nastavitHighScore() {
    for(var i=1; i<= 10; i++) {
        var hs;

        hs = getCookie("hslevel"+i.toString());

        $("#skore"+i.toString()).text(hs);
    }
}

function resetHighScore() {
    for(var i=1; i<= 10; i++) {
        document.cookie = "hslevel"+i.toString()+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    nastavitHighScore();
}

function setGameAndScore() {
    var select = $("#vyber_levelu");

    cisloHry = select.prop('selectedIndex');
    var pocetBodov = $("#pocet_bodov");
    var nastaveneBody = parseInt(pocetBodov.val());
    if(!isNaN(nastaveneBody)) {
        body = nastaveneBody;
        var hs;
        hs = getCookie("hslevel"+(cisloHry+1).toString());
        hs = parseInt(hs);
        if(isNaN(hs)){
            setCookie("hslevel"+(cisloHry+1).toString(),body.toString(),100);
        }
        else if(body > hs) {
            setCookie("hslevel"+(cisloHry+1).toString(),body.toString(),100);
        }
    }
    nastavitHighScore();
    setup();
}

function hraReset() {
    undo.length = 0; //vymazanie undo stacku
    bodyZaLevel = 100;
    setup();
}

function hraUndo() {
    if(undo.length > 0) {
        bodyZaLevel += 1;
        undid = true;
        setup();
    }
}

function hraSave() {
    var rozlozenie = mapaBlokovToStr();

    rozlozenie = rozlozenie.replace(/;/g, "-");

    //ulozenie cisla hry a aktualneho rozlozenia ako cookie na 100 dni
    setCookie("rozlozenie", rozlozenie, 100);
    setCookie("cislohry", cisloHry.toString(), 100);
    setCookie("pocetbodov", body.toString(), 100);
    setCookie("skore"+(cisloHry+1).toString(), bodyZaLevel.toString(), 100);

    alert("Hra úspešne uložená");
}


/*Prevzate z https://www.w3schools.com/js/js_cookies.asp*/
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
/*Prevzate z https://www.w3schools.com/js/js_cookies.asp*/
function getCookie(cname) {
    var name = cname + "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}

//Logika hry

const GRID_X = 64;
const GRID_Y = 64;
const OFFSETTOP = 20;
const OFFSETBOT = 20;

var stage, renderer, loader;
var mapa, mapaBlokov, solutions, cisloHry = 0, body = 0, bodyZaLevel = 100;
var textBody;
var loaded = false, undid = false, loadedLevel = false;
var undo = [];


function load() {
    stage = new PIXI.Container();
    renderer = PIXI.autoDetectRenderer(
        320, 320,
        {antialias: false, transparent: false, resolution: 1}
    );
    renderer.view.style.border = "1px dashed black";
    renderer.backgroundColor = 0x061639;
    renderer.autoResize = true;

    renderer.render(stage);

    $("#div_hry").append(renderer.view);

    loader = PIXI.loader
        .add([
            "assets/finish.png",
            "assets/start.png",
            "assets/box.png",
            "assets/direct.png",
            "assets/turn.png",
            "assets/ball.png",
            "assets/statbox.png"
        ])
        .load(setup);
}

function setup() {
    clearStage();

    var rozlozenie = getCookie("rozlozenie");
    var cHry = getCookie("cislohry");
    var pocetBodov = getCookie("pocetbodov");
    var pocetBodovZaLevel;

    //nacitanie ulozenych cookies
    if(cHry !== "" && loaded === false && loadedLevel === false) {
        cisloHry = parseInt(cHry); //nastavenie levelu
        document.cookie = "cislohry=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        if(pocetBodov !== "" ) {
            body = parseInt(pocetBodov); //nastavenie bodov
            document.cookie = "pocetbodov=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            pocetBodovZaLevel = getCookie("skore"+(cisloHry+1).toString()); //nacita ulozene body za dany level
            //vymazanie ulozenych cookies
            document.cookie = "skore"+(cisloHry+1).toString()+"=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            if(pocetBodovZaLevel !== ""){
                bodyZaLevel = parseInt(pocetBodovZaLevel);
            }
        }
        else {
            loadedLevel = true;
        }
    }
    else {
        loaded = true;
    }

    var hra = findGame(cisloHry);

    var width = 2*(GRID_X/2) + hra.vSize * GRID_X;
    var height = 2*(GRID_Y/2) + hra.hSize * GRID_Y + OFFSETTOP + OFFSETBOT;
    renderer.view.style.width = width +'px';
    renderer.view.style.height = height + 'px';
    renderer.resize(width, height);

    if(rozlozenie !== "" && loaded === false) {
        rozlozenie = rozlozenie.replace(/-/g,";");
        hra.loadedTask = rozlozenie;
        document.cookie = "rozlozenie=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }
    else if(undid === true) {
        rozlozenie = undo.pop();
        hra.undoTask = rozlozenie;
    }

    textBody = new PIXI.Text("Skóre: "+bodyZaLevel.toString());
    textBody.style.fill = 0xFFFFFF;
    textBody.x = 10;
    textBody.y = 10;
    stage.addChild(textBody);


    var textLevel = new PIXI.Text("Level: "+(cisloHry + 1).toString()+ "/10");
    textLevel.style.fill = 0xFFFFFF;
    textLevel.x = renderer.width - 150;
    textLevel.y = 10;
    stage.addChild(textLevel);

    var textCelkBody = new PIXI.Text("Celkové skóre: "+body.toString());
    textCelkBody.style.fill = 0xFFFFFF;
    textCelkBody.x = 10;
    textCelkBody.y = renderer.height - 40;
    stage.addChild(textCelkBody);

    loadGame(hra);

    renderer.render(stage);
}

function loadGame(hra) {
    var hSize = hra.hSize, vSize = hra.vSize;
    fillMap(hSize, vSize);
    solutions = hra.solution;
    mapaBlokov = new Array(hSize);

    if(loaded === false && hra.loadedTask !== "") {
        loadTask(hra.loadedTask,hSize,vSize);
        loaded = true;
    }
    else if(undid === true) {
        loadTask(hra.undoTask,hSize,vSize);
        undid = false;
    }
    else {
        loadTask(hra.task, hSize, vSize);
    }

    setCookie("cislohry", cisloHry.toString(), 100); //ulozenie cisla levelu pre opatovne hranie
}

function loadTask(task, hSize, vSize) {
    var x, y;
    x = GRID_X;
    y = GRID_Y + OFFSETTOP;
    var riadkyTask = task.split(";");

    for (var i = 0; i < hSize; i++) {
        var blokyTask = riadkyTask[i].split(",");

        mapaBlokov[i] = blokyTask;

        for(var j = 0; j < vSize; j++) {
            var atr = findBlock(blokyTask[j]);

            if(atr.img !== "assets/empty.png") {
                var sprite = createSprite(atr, blokyTask[j], x, y);

                mapa[i+1][j+1] = 1; //posunute kvoli ohraniceniu
                stage.addChild(sprite);

                if(atr.img === "assets/start.png") {
                    atr.img = "assets/ball.png";
                    atr.rotation = 0;
                    sprite = createSprite(atr, "BALL", x, y);
                    stage.addChild(sprite);
                }
            }
            x += GRID_X;
        }
        y += GRID_Y;
        x = GRID_X;
    }
    renderer.render(stage);
}

//cislo prvej hry je 0
function findGame(cisloHry) {
    var hra = xmlDoc.getElementsByTagName("game")[cisloHry];

    var vSize = hra.getElementsByTagName("size")[0].children[0].innerHTML;
    var hSize = hra.getElementsByTagName("size")[0].children[1].innerHTML;
    var task = hra.getElementsByTagName("task")[0].innerHTML;
    var solution = hra.getElementsByTagName("solution");

    return {
        vSize: parseInt(vSize),
        hSize: parseInt(hSize),
        task: task,
        solution: solution,
        loadedTask: "",
        undoTask: ""
    };
}


function findBlock(nazov) {
    var blocks = xmlDoc.getElementsByTagName("block");
    for(var i = 0; i < blocks.length; i++) {
        var blockName = blocks[i].getElementsByTagName("name")[0].innerHTML;

        if(blockName === nazov) {
            var img = blocks[i].getElementsByTagName("img")[0].innerHTML;
            var rot = blocks[i].getElementsByTagName("rotation")[0].innerHTML;
        }
    }
    return {img: img, rotation: rot};
}

//funkcia vytvori novy sprite pre dany obrazok, s danym nazvom, a na suradniciach x,y
function createSprite(atributes, nazov, x, y) {
    var sprite = new PIXI.Sprite(loader.resources[atributes.img].texture); //novy sprite

    sprite.interactive = true;
    sprite.buttonMode = true;

    //Ak je blok box start alebo koniec tak sa nesmie dat posuvat
    if(nazov.charAt(0) !== "S" && nazov.charAt(0) !== "F" && nazov !== "BALL" && nazov !== "SB") {
        sprite
            .on('pointerdown', onDragStart)
            .on('pointerup', onDragEnd)
            .on('pointerupoutside', onDragEnd)
            .on('pointermove', onDragMove);
    }
    sprite.anchor.set(0.5,0.5); //ukotvovaci bod v strede obrazku

    sprite.rotation = (parseInt(atributes.rotation)*Math.PI)/180;
    sprite.x = x;
    sprite.y = y;

    return sprite;
}


function fillMap(sirka, vyska) {
    mapa = new Array(vyska+2);

    for(var i = 0; i < vyska+2; i++) {
        mapa[i] = new Array(sirka+2).fill(0);
    }

    //Ohranicenie
    mapa[0].fill(1);
    mapa[vyska+1].fill(1);
    for(i = 1; i < vyska+1; i++) {
        mapa[i][0] = 1;
        mapa[i][sirka+1] = 1;
    }
}

function mapaBlokovToStr() {
    var rozlozenie="";
    for(var i = 0; i < mapaBlokov.length; i++) {
        for(var j = 0; j < mapaBlokov[0].length; j++) {
            rozlozenie += mapaBlokov[i][j];
            if(j < mapaBlokov[0].length-1) {
                rozlozenie += ",";
            }
        }
        if(i < mapaBlokov.length - 1) {
            rozlozenie += ";";
        }
    }
    return rozlozenie;
}

function checkSolutionRiadky(riadokSolution, riadokTask) {
    var solution = riadokSolution.split(',');
    var task = riadokTask.split(',');

    for(var i = 0; i < solution.length; i++) {
        if (solution[i] === "N") {
            continue;
        }
        if (solution[i] !== task[i]) {
            return false;
        }
    }
    return true;
}

function checkSolution(rozlozenie) {
    var vyhra;
    for (var i = 0; i < solutions.length; i++) {
        var riadokSolution = solutions[i].innerHTML.split(';');
        var riadokTask = rozlozenie.split(';');

        for (var j = 0; j < riadokSolution.length; j++) {
            vyhra = checkSolutionRiadky(riadokSolution[j], riadokTask[j]);
            if (vyhra === false) {
                break;
            }
        }
        if (vyhra === true) {
            var hsLevel = getCookie("hslevel"+(cisloHry+1).toString());
            //prazdne ak sa hra hra prvy krat
            if(hsLevel === "") {
                setCookie("hslevel" + (cisloHry + 1).toString(), bodyZaLevel.toString(), 100);
                nastavitHighScore();
            }
            else {
                if(body > parseInt(hsLevel)) {
                    setCookie("hslevel" + (cisloHry + 1).toString(), bodyZaLevel.toString(), 100);
                    nastavitHighScore();
                }
            }

            cisloHry++;
            undo.length = 0;
            body += bodyZaLevel;

            if (cisloHry > 9) {
                alert("Prešli ste všetky levely gratulujem ! Získali ste dokopy " + body.toString() + " bodov.");
                cisloHry = 0;
            }
            else {
                alert("Gratulujem vyhrali ste. Za tento level ste získali " + bodyZaLevel.toString() + " bodov");
            }
            setup();
        }
    }
}

function onDragStart(event) {
    this.data = event.data;
    this.dragging = true;
    renderer.render(stage);
}

function onDragEnd() {
    this.dragging = false;
    // set the interaction data to null
    this.data = null;
}

function onDragMove() {
    var stlpec,riadok;
    var pUp = false, pDown = false, pLeft = false, pRight = false; //flagy povoleni
    var dlzka, uhol;
    var s1 = 45*Math.PI/180, s2 = 135*Math.PI/180, s3 = 225*Math.PI/180, s4 = 315*Math.PI/180;
    if (this.dragging) {
        var newPosition = this.data.getLocalPosition(this.parent);

        //euklidovksa dlzka
        dlzka = Math.sqrt(Math.pow(newPosition.x-this.x,2) + Math.pow(newPosition.y-this.y,2));
        uhol = Math.atan2(newPosition.y-this.y, newPosition.x-this.x);
        if(uhol < 0) {
            uhol += 2*Math.PI;
        }
        this.anchor.set(0,0);

        //Vypocet indexov v mape
        stlpec = Math.round(this.x / GRID_X);
        riadok = Math.round(this.y / GRID_Y);

        this.anchor.set(0.5,0.5);

        //Nastavenie povoleni
        pUp = (mapa[riadok-1][stlpec] === 0);
        pDown = (mapa[riadok+1][stlpec] === 0);
        pLeft = (mapa[riadok][stlpec-1] === 0);
        pRight = (mapa[riadok][stlpec+1] === 0);

        if(uhol > s1 && uhol < s2 && dlzka > this.width/2 && pDown === true) {
            //DOLE
            bodyZaLevel -= 1;
            if(bodyZaLevel < 0)
                bodyZaLevel = 0;
            textBody.setText("Skóre: "+ bodyZaLevel.toString());

            mapa[riadok][stlpec] = 0;
            mapa[riadok+1][stlpec] = 1;

            undo.push(mapaBlokovToStr());

            mapaBlokov[riadok][stlpec-1] = mapaBlokov[riadok-1][stlpec-1];
            mapaBlokov[riadok-1][stlpec-1] = "E";

            this.y += GRID_Y;
            this.dragging = false;

            checkSolution(mapaBlokovToStr());
        }
        else if(uhol > s2 && uhol < s3 && dlzka > this.width/2 && pLeft === true) {
            //DOLAVA
            bodyZaLevel -= 1;
            if(bodyZaLevel < 0)
                bodyZaLevel = 0;
            textBody.setText("Skóre: "+ bodyZaLevel.toString());

            mapa[riadok][stlpec] = 0;
            mapa[riadok][stlpec-1] = 1;

            undo.push(mapaBlokovToStr());

            mapaBlokov[riadok-1][stlpec-2] = mapaBlokov[riadok-1][stlpec-1];
            mapaBlokov[riadok-1][stlpec-1] = "E";

            this.x -= GRID_X;
            this.dragging = false;

            checkSolution(mapaBlokovToStr());
        }
        else if(uhol > s3 && uhol < s4 && dlzka > this.width/2 && pUp === true) {
            //HORE
            bodyZaLevel -= 1;
            if(bodyZaLevel < 0)
                bodyZaLevel = 0;
            textBody.setText("Skóre: "+ bodyZaLevel.toString());

            mapa[riadok][stlpec] = 0;
            mapa[riadok-1][stlpec] = 1;

            undo.push(mapaBlokovToStr());

            mapaBlokov[riadok-2][stlpec-1] = mapaBlokov[riadok-1][stlpec-1];
            mapaBlokov[riadok-1][stlpec-1] = "E";

            this.y -= GRID_Y;
            this.dragging = false;

            checkSolution(mapaBlokovToStr());
        }
         else if((uhol > s4 || uhol < s1) && dlzka > this.width/2 && pRight === true) {
            //DOPRAVA
            bodyZaLevel -= 1;
            if(bodyZaLevel < 0)
                bodyZaLevel = 0;
            textBody.setText("Skóre: "+ bodyZaLevel.toString());

            mapa[riadok][stlpec] = 0;
            mapa[riadok][stlpec+1] = 1;

            undo.push(mapaBlokovToStr());

            mapaBlokov[riadok-1][stlpec] = mapaBlokov[riadok-1][stlpec-1];
            mapaBlokov[riadok-1][stlpec-1] = "E";

            this.x += GRID_X;
            this.dragging = false;

            checkSolution(mapaBlokovToStr());
        }

        renderer.render(stage);
    }
}


function clearStage() {
    while(stage.children[0]) {
        stage.removeChild(stage.children[0]);
    }
}
