var server = ""; //http://niconoip.hopto.org:8081
var alumnoId = "";
var store;
var deviceType;
var familiar;
var encuesta;
var itemActualEncuesta = 0;
var respuestaEncuesta;
var cargueVideos = false;
var cargueImagenes = false;
var cargueComunicados = false;
var videoData = {};
var comunicados = [];
var comunicadosMostrados = 0;
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function() { 
        app.receivedEvent('deviceready');
        app.setupPush();
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) { 
        deviceType = (navigator.userAgent.match(/iPad/i))  == "iPad" ? "iPad" : (navigator.userAgent.match(/iPhone/i))  == "iPhone" ? "iPhone" : (navigator.userAgent.match(/Android/i)) == "Android" ? "Android" : (navigator.userAgent.match(/BlackBerry/i)) ==  "BlackBerry" ? "BlackBerry" : "null";
        if (deviceType == "iPhone"){
            store = cordova.file.documentsDirectory;
        }
        else if (deviceType == "Android"){
            store = cordova.file.externalDataDirectory;
        }
        server = host;
        $.get( server+"/checkAuth/familiares/"+device.uuid, function( data ) {
            console.log(data);
            if (data == 'noautorizado'){
                
                $(':mobile-pagecontainer').pagecontainer('change', '#login', {
                    transition: 'flip',
                    changeHash: false,
                    reverse: true,
                    showLoadMsg: true
                });
            }
            else{
                $.getJSON( server+"/getFamiliar/"+device.uuid, function( data ) {
                    familiar = data;
                    loadAlumnosDeFamiliar(); 
                });
                
            }
        }).fail(function(jqXHR, textStatus, errorThrown) {
            irAPaginaError();
        });            
    },
    setupPush: function() {
        console.log('calling push init');
        var push = PushNotification.init({
            "android": {
                "senderID": "XXXXXXXX"
            },
            "browser": {},
            "ios": {
                "sound": true,
                "vibration": true,
                "badge": true
            },
            "windows": {}
        });
        console.log('after init');

        push.on('registration', function(data) {
            console.log('registration event: ' + data.registrationId);

            var oldRegId = localStorage.getItem('registrationId');
            if (oldRegId !== data.registrationId) {
                // Save new registration ID
                localStorage.setItem('registrationId', data.registrationId);
                // Post registrationId to your app server as the value has changed
            }

            var parentElement = document.getElementById('registration');
            var listeningElement = parentElement.querySelector('.waiting');
            var receivedElement = parentElement.querySelector('.received');

            listeningElement.setAttribute('style', 'display:none;');
            receivedElement.setAttribute('style', 'display:block;');
        });

        push.on('error', function(e) {
            console.log("push error = " + e.message);
        });

        push.on('notification', function(data) {
            console.log('+++++++++++++++++++++++++');
            console.log('notification event');
            console.log(data);
            navigator.notification.alert(
                data.message,         // message
                null,                 // callback
                data.title,           // title
                'Ok'                  // buttonName
            );
       });
    }      
}; 

function ingresar(){
    var error = false;
    var ci = $("#cifamiliar").val();
    var codigo = $("#code").val();
    if (ci == '' || ci == null){
        $("#cifamiliarerror").val("Debe ingresar este campo.");
        error = true;
    }
    if (codigo == '' || codigo == null){
        $("#codeerror").val("Debe ingresar este campo.");
        error = true;
    }
    if (!error){ 
         $.get( server+"/ingresar/familiares/"+ci+"/"+device.uuid+"/"+codigo, function( data ) {
            console.log(data );
            if (data == 'ok'){
               $(':mobile-pagecontainer').pagecontainer('change', '#start', {
                transition: 'flip',
                changeHash: false,
                reverse: true,
                showLoadMsg: true
                });
                $.getJSON( server+"/getFamiliar/"+device.uuid, function( data1 ) {
                    familiar = data1;
                    loadAlumnosDeFamiliar(); 
                });
            } 
        }).fail(function(jqXHR, textStatus, errorThrown) {
            irAPaginaError();
        }); 
     } 
} 

function loadAlumnos(){
    $.getJSON( server+"/verColeccion/alumnos", function( data ) {
        var alumnosListHTML = "";
        $.each( data, function( key, val ) {
            alumnosListHTML += "<option  value='"+val._id+"'>"+val.nombres+" "+val.apellidos+"</option>";
        });
        $("#alumnosList").html("");
        $("#alumnosList").html(alumnosListHTML);
        $("#alumnosList").selectmenu("refresh");

    }).fail(function(jqXHR, textStatus, errorThrown) {
        irAPaginaError();
    });
}

function loadAlumnosDeFamiliar(){
    console.log(familiar);
    $.getJSON( server+"/alumnosDeFamiliar/"+familiar._id, function( data ) {
        console.log(data);
        var alumnosListHTML = "";
        $.each( data, function( key, val ) {
            alumnosListHTML += "<option  value='"+val._id+"'>"+val.nombres+" "+val.apellidos+"</option>";
        });
        $("#alumnosList").html("");
        $("#alumnosList").html(alumnosListHTML);
        $("#alumnosList").selectmenu("refresh");

    }).fail(function(jqXHR, textStatus, errorThrown) {
        irAPaginaError();
    });
}

function empezar(){
         
    cargueVideos = false;
    cargueImagenes = false;
    cargueComunicados = false;
    
    $("#verVideo").empty();
    $("#imagenGaleria").empty();
    $("#comunicadosPagina").empty();
    $('#imagenPanel').css("display", "none");
    $('#comunicadosPanel').css("display", "none");  
    $('#videosPanel').css("display", "none"); 
   
    alumnoId = $("#alumnosList").val();
    $("#alumnoName").html($("#alumnosList").children('option:selected').html());
    $( "#fichaDiariaPanel" ).html("");
}

//////////////VIDEOS
function loadVideosAlumno(){
    $('#imagenPanel').css("display", "none");
    $('#comunicadosPanel').css("display", "none");
    $("#ulVideo").html("");
    $('#videosPanel').css("display", "block");
    $.getJSON( server+"/contenidosDeAlumno/Video/"+alumnoId, function( data ) {
        videoData = data;
        var htmlInterior = "";
        if(data.length == 0){
            htmlInterior += "<p>No hay videos para mostrar</p>";
            $("#videosTexto").empty();
            $("#videosTexto").append(htmlInterior);
        } else {
            $.each( data, function( key, val ) {
                var fechaAux = new Date(val.fecha.split("T")[0]);
                var mes = parseInt(fechaAux.getMonth()) + 1;
                var fechaString = fechaAux.getDate()+"/"+mes+"/"+fechaAux.getFullYear();
                console.log(fechaAux);
                //htmlInterior += "<li class='videolink' key='"+key+"' file='"+val.nombreArchivo+"''>"+val.nombre+"</li>";
                htmlInterior += "<li class='videolink' key='"+key+"' file='"+val.nombreArchivo+"''>";
                    htmlInterior += "<p>"+val.nombre+"</p>";
                    htmlInterior += "<p>"+fechaString+"</p>";
                    htmlInterior += "<p>"+val.descripcion+"</p>";
                htmlInterior += "</li>";
                $("#ulVideo").append(htmlInterior);

            });   
            //Cargo los compartamientos de clases. 
            //Compartamiento asociado a hacer click en un elmento de la lista de videos.
            $( ".videolink" ).on( "click", function() {
                checkFileInMobile($( this ).attr("key"));
            });
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        irAPaginaError();
    });
}

function checkFileInMobile(clave){
    //Chequea si un archivo existe en el celular o no.
    var fileName = videoData[clave].nombreArchivo;
    window.resolveLocalFileSystemURL(store + fileName,                                
            function(fileEntry){ 
                checkAndLoadFile(store+fileName, clave);
            },
            function(error){
                downloadFileAndLoad(fileName, clave);
            });

}

function checkAndLoadFile(ruta, clave){
    //Si ya existe el archivo lo muestra para reproducir.
    var v = "";
    if (deviceType == "iPhone"){
        v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
    }    
    else if (deviceType == "Android"){
                if (ruta.includes(".MOV")){
                    v += "<video width=\"100%\" class='video-js' height=\"auto\" autoplay controls preload='auto' data-setup=\"{}\">";
                }
                else{
                    v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
                }
    }
        v += "<source id='videoup' src='" + ruta + "' type='video/mp4'>";
        v += "<source id='videoup' src='" + ruta + "' type='video/webm'>";
        v += "</video><p>"+videoData[clave].descripcion+"</p>";
    $("#verVideo").html(v);
    $("video").focus();
}

function downloadFileAndLoad(nombreArchivo, clave){
    //Si no existe el archivo, primero lo descargo del servidor.
    console.log("No existe el archivo");
    var fileTransfer = new FileTransfer();
    var uri = encodeURI(server+"/"+nombreArchivo);
    var fileURL = store + nombreArchivo;
    fileTransfer.download(
        uri,
        fileURL,
        function(entry) {
            var v = "";
            if (deviceType == "iPhone"){
                v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
            }  
            else if (deviceType == "Android"){
                if (ruta.includes(".MOV")){
                    v += "<video width=\"100%\" class='video-js' height=\"auto\" autoplay controls preload='auto' data-setup=\"{}\">";
                }
                else{
                    v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
                }
            }            
                v += "<source id='videoup' src='" + fileURL + "' type='video/mp4'>";
                v += "<source id='videoup' src='" + fileURL + "' type='video/webm'>";
            v += "</video><p>"+videoData[clave].descripcion+"</p>";
            $("#verVideo").html(v);
            $("video").focus();

        },
        function(error) {
            console.log("download error source " + error.source);
            console.log("download error target " + error.target);
            console.log("upload error code" + error.code);
        },
        false,
        {
            headers: {

            }
        }
    );
    
}

///////IMÁGENES
function loadImagenesAlumno(){
    console.log(alumnoId);
    $('#videosPanel').css("display", "none");
    $('#comunicadosPanel').css("display", "none");
    $('.imagenGaleria').html("");
    $('#imagenPanel').css("display", "block");
    $.getJSON( server+"/contenidosDeAlumno/Imagen/"+alumnoId, function( data ) {
        console.log(data.length);
        var htmlInterior = "";
        if(data.length == 0){
            htmlInterior += "<p>No hay imágenes para mostrar</p>";
            $('.imagenGaleria').append(htmlInterior);
        } else {
            $.each( data, function( key, val ) {
                htmlInterior = "<div class= 'responsive'>";
                    htmlInterior += "<div class='img'>";
                        htmlInterior += "<a class='imagenGaleriaLink'>";
                            htmlInterior += "<img src='"+server+"/"+val.nombreArchivo+"' >";
                        htmlInterior += "</a>"; 
                    htmlInterior += "<div class='desc' style='font-size: 2vw;'>"+val.descripcion+"</div>";
                    htmlInterior += "</div>";
                htmlInterior += "</div>";               
                $('.imagenGaleria').append(htmlInterior);   
            });
            $(".imagenGaleriaLink").click(function(){
                console.log("Empezmos bien");
                $("#imagenPopupModal").css("display", "block");
                $("#imagenPopup").attr("src", $(this).children("img").attr("src"));
                $("#caption").html = "Probando";
                $(".close").click(function(){
                    $("#imagenPopupModal").css("display", "none");
                });
            }); 
        }           
    }).fail(function(jqXHR, textStatus, errorThrown) {
        irAPaginaError();
    });
}

///////COMUNICADOS
function loadComunicadosAlumno(){
    $('#videosPanel').css("display", "none");
    $('#imagenPanel').css("display", "none");    
    if (cargueComunicados){
        $('#comunicadosPanel').css("display", "block");
    }
    else{
        $('#comunicadosPanel').css("display", "block");
        $.getJSON( server+"/contenidosDeAlumno/Comunicado/"+alumnoId, function( data ) {

            if(data.length == 0){
                var htmlInterior = "";
                htmlInterior += "<p>No hay comunicados para mostrar</p>";
                $('#comunicadosPagina').empty(htmlInterior);
                $('#comunicadosPagina').append(htmlInterior);
            } else {

                comunicados = data
                comunicadosMostrados = 0;
                mostrarMasComunicados(false); //Mostrar los 3 comunicados mas recientes.
            }

        }).fail(function(jqXHR, textStatus, errorThrown) {
            irAPaginaError();
        });
        cargueComunicados = true;
    }
}

function mostrarMasComunicados(mostrarTodos) {
    var htmlInterior = "";
    var cantidad;
    var mensajeBoton;

    if(mostrarTodos) {
        cantidad = Object.keys(comunicados).length;
        mensajeBoton = "Mostrar menos";
    } else {
        cantidad = 3;
        mensajeBoton = "Mostrar anteriores";
    }

    for (var i = 0; i < cantidad; i++) {

        console.log(comunicados[i].titulo);
        var fechaAux = new Date(comunicados[i].fecha.split("T")[0]);
        var mes = parseInt(fechaAux.getMonth()) + 1;
        var fechaString = fechaAux.getDate()+"/"+mes+"/"+fechaAux.getFullYear();
        console.log(fechaAux);
        htmlInterior += "<hr /><p><b>"+ fechaString + " - " + comunicados[i].titulo+"</b></p>";
        htmlInterior += "<p><i>"+comunicados[i].cuerpo+"</i></p>";
    }
    htmlInterior += '<hr /><a id="btMostrarMas" class="ui-btn ui-shadow ui-corner-all" data-role="button mini" onclick="mostrarMasComunicados('
            + !mostrarTodos + ')">' + mensajeBoton + '</a>';
    $('#comunicadosPagina').empty(htmlInterior);
    $('#comunicadosPagina').append(htmlInterior);
}

//////ASISTENCIARIO
function fichaDiariaAlumno(){
    $( "#fichaDiariaPanel" ).html("");
    $.getJSON( server+"/getAsistenciarioAlumno/"+alumnoId+"/"+$("#asistenciarioDate").val(), function( data ) {
        var htmlFichaDiaria = "";
        if(data) {
             console.log(data.alumno);
             htmlFichaDiaria += "<p><b>"+data.alumno.nombres+" "+data.alumno.apellidos+"</b></p>";
             $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             if (data.entrada != null){
                try{
                    var d = new Date(data.entrada);
                    var minutes = d.getMinutes();
                    if (minutes < 10){
                        minutes = "0"+minutes;
                    }
                    htmlFichaDiaria = "<table data-role=\"table\" id=\"entradaTabla\"><tr><td style=\"color: #48a4ff\">Entrada </td>";
                    htmlFichaDiaria += "<td>"+d.getHours()+":"+minutes+"</td></tr></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                }
                catch(e){
                    console.log("Fallo en la fecha.");
                }
             } 
             if (data.salida != null){
                try{
                    var d = new Date(data.salida);
                    var minutes = d.getMinutes();
                    if (minutes < 10){
                        minutes = "0"+minutes;
                    }
                    htmlFichaDiaria = "<table data-role=\"table\" id=\"salidaTabla\"><tr><td style=\"color: #48a4ff\">Salida </td>";
                    htmlFichaDiaria += "<td>"+d.getHours()+":"+minutes+"</td></tr></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                }
                catch(e){
                    console.log("Fallo en la fecha."); 
                }            
             }
             if (data.panhales != null){
                console.log("1");
                var pan = JSON.parse(data.panhales);
                htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"panhalesTabla\"><tr><td style=\"color: #48a4ff\">Pañales</td></tr>";
                htmlFichaDiaria += "<tr><td>Cant.Cambios</td><td>Orinó</td><td>Evacuó</td></tr>";
                htmlFichaDiaria += "<tbody><tr><td>"+pan.veces+"</td><td>"+pan.orino+"</td><td>"+pan.evacuo+"</td></tr></tbody></table>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             }
            if (data.mamaderas != null){
                var mam = JSON.parse(data.mamaderas);
                console.log("2");
                htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"mamaderasTabla\"><tr><td style=\"color: #48a4ff\">Mamaderas</td></tr>";
                htmlFichaDiaria += "<tr><td>Mililitros</td><td>Tomas diarias</td></tr>";
                htmlFichaDiaria += "<tbody><tr><td>"+mam.mililitros+"</td><td>"+mam.tomas+"</td></tr></tbody></table>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             }
             if (data.almuerzo != null){
                var alm = JSON.parse(data.almuerzo);
                htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"almuerzoTabla\"><tr><td style=\"color: #48a4ff\">Almuerzo</td>";
                htmlFichaDiaria += "<td>"+alm.comportamiento+"</td></tr></table>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             }     
             if (data.postre != null){
                var alm = JSON.parse(data.postre);
                htmlFichaDiaria = "<table data-role=\"table\" id=\"postreTabla\"><tr><td style=\"color: #48a4ff\">Postre</td>";
                htmlFichaDiaria += "<td>"+alm.comportamiento+"</td></tr></table>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             }  
             if (data.merienda != null){
                var alm = JSON.parse(data.merienda);
                htmlFichaDiaria = "<table data-role=\"table\" id=\"meriendaTabla\"><tr><td style=\"color: #48a4ff\">Merienda</td>";
                htmlFichaDiaria += "<td>"+alm.comportamiento+"</td></tr></table>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             }   
             if (data.siesta != null){
                var sis = JSON.parse(data.siesta);
                htmlFichaDiaria = "<table data-role=\"table\" id=\"siestaTabla\"><tr><td style=\"color: #48a4ff\">Siesta</td>";
                htmlFichaDiaria += "<td>"+sis.minutos+" minutos</td></tr></table>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             }            
             if (data.nota != null){
                htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"siestaTabla\"><tr><td style=\"color: #48a4ff\">Nota</td></tr>";
                htmlFichaDiaria += "<tr><td><i>"+data.nota+"</i></td></tr></table>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
             }
        } else {
            htmlFichaDiaria = "<p>No existen registros para ese día.</p>";
            $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
        }                                   

    }).fail(function(jqXHR, textStatus, errorThrown) {
        irAPaginaError();
    });

}

//////ENCUESTAS
function loadEncuestas(){
    $("#encuestasPanel").html("");
     $.getJSON( server+"/encuestasFamiliar/"+familiar._id, function( data ) {
        var htmlInterior = "";
        $.each( data, function( key, val ) {
            htmlInterior = "<a href='#' class='encuestaLink' id='"+val._id+"' >"+val.nombre+"</a><br />";
            $("#encuestasPanel").append(htmlInterior);

        });
        $(".encuestaLink").click(function(){
            $("#navBarButtons1").css("display", "block");
            $("#navBarButtons2").css("display", "none");
            $.getJSON( server+"/encuesta/"+$(this).attr("id"), function( data1 ) {
                $("#encuestaPanel").append("<p>"+data1.descripcion+"</p>");
                itemActualEncuesta = 0;
                respuestaEncuesta = [];
               // $("#encuestaPanel").append('<a id="btComenzarEncuesta" data-role="button" onclick="loadItem()">Comenzar</a>');
                //$("#btComenzarEncuesta").button();
                encuesta = data1;
                $(':mobile-pagecontainer').pagecontainer('change', '#encuestaPage', {
                    transition: 'flip',
                    changeHash: false,
                    reverse: true, 
                    showLoadMsg: true
                });
            }).fail(function(jqXHR, textStatus, errorThrown) {
                var errorHtml = "<p>"+jqXHR.responseText+"</p>";
                errorHtml += "<p> Código de error: "+jqXHR.status+"</p>";
                errorHtml += "<p> Llamada: Llamada a loadEncuestas() luego de crear</p>";
                errorHtml += "<p>Pruebe reiniciar la aplicación luego.</p>";
                $("#errorMsg").html(errorHtml);
                console.log( "error "+jqXHR.responseText  );
            });
        });

    }).fail(function(jqXHR, textStatus, errorThrown) {
        irAPaginaError();
    });
}

function loadItem(){
    if (itemActualEncuesta < encuesta.itemsencuesta.length){
        var itemEncuesta = encuesta.itemsencuesta[itemActualEncuesta];
        itemActualEncuesta = itemActualEncuesta + 1;
        console.log(itemEncuesta.tipo);
        $("#encuestaPanel").html("<p>Pregunta número "+itemActualEncuesta+"</p>");
        switch(itemEncuesta.tipo) {
        case "multiple":
            loadItemMultiple(itemEncuesta);
            break;
        case "checkbox":
            loadItemCheckbox(itemEncuesta);
            break;
        case "textual":
            loadItemTextual(itemEncuesta);
            break;
        default:
            console.log("Item incorrecto");
        }
    }
    else{
        $("#encuestaPanel").html("<p>Gracias por responder.</p>");
        $("#encuestaItemPanel").html("");
        $("#navBarButtons2").css("display", "block");
        $("#navBarButtons1").css("display", "none");
        console.log(respuestaEncuesta);
        var url = server+"/subirRespuestaEncuesta/"+encuesta._id+"/"+familiar._id;
        var respuestaFinal = {"respuesta" : respuestaEncuesta};
        console.log(respuestaFinal);
        $.post(url,respuestaFinal,'json');
    }
} 

function loadItemMultiple(it){
    console.log(it);
    $("#encuestaItemPanel").html("");
    var htmlInterior = "<fieldset id='fieldsetItemMultiple' data-role='controlgroup'>";
    htmlInterior += "<legend>"+it.titulo+"</legend>";
    console.log(it.items);
    $.each(it.items, function( key, val ) {
       htmlInterior += "<label for='"+key+"'>"+val.etiqueta+"</label>"; 
       htmlInterior += "<input class='itcheckbox' type='checkbox' id='"+key+"' value='"+val.valor+"'/>";
    });
    htmlInterior +="</fieldset><hr />";
    htmlInterior += '<a id="btItemMultiple" data-role="button mini" onclick="checkItemMultiple()">Siguiente</a>';
    $("#encuestaItemPanel").append(htmlInterior);
    $("#btItemMultiple").button();

    $('.itcheckbox').checkboxradio();
}

function checkItemMultiple(){
   console.log($("#fieldsetItemMultiple :checked").size());
    var respuestas = [];
    $("#fieldsetItemMultiple :checked").each(function() {
        respuestas.push($(this).val());
    });
    //$.each($("#fieldsetItemMultiple :checked"), function(key, val){
        //respuestas.push(val);
   // });
    console.log(respuestas);
    respuestaEncuesta.push(respuestas);
    loadItem(); 
}

function loadItemCheckbox(it){
    console.log(it);
    $("#encuestaItemPanel").html("");
    var htmlInterior = "<fieldset id='fieldsetItemMultiple' data-role='controlgroup'>";
    htmlInterior += "<legend>"+it.titulo+"</legend>";
    console.log(it.items);
    $.each(it.items, function( key, val ) {
       if (key == 0){
         htmlInterior += "<input type='radio' name='radiochoice' id='"+key+"' value='"+val.valor+"' checked='checked'/>";
       } 
       else{
        htmlInterior += "<input type='radio' name='radiochoice' id='"+key+"' value='"+val.valor+"'/>";
       }
       htmlInterior += "<label for='"+key+"'>"+val.etiqueta+"</label>"; 
    });'<fieldset data-role="controlgroup"><legend>Checkbox 1</legend><input type="radio" name="radio" id="rid0" value="opck1" checked="checked"/><label for="rid0">Opción check 1</label><input type="radio" name="radio1" id="rid1" value="opck2"/><label for="rid1">Opción check 2</label></fieldset>'
    htmlInterior +="</fieldset><hr />";
    htmlInterior += '<a id="btItemMultiple" data-role="button mini" onclick="checkItemCheckbox()">Siguiente</a>';
    $("#encuestaItemPanel").append(htmlInterior);
    $("#btItemMultiple").button();
    $('[type="radio"]').checkboxradio();
}

function checkItemCheckbox(){
   console.log($("#fieldsetItemMultiple :checked").size());
    var respuestas = [];
    $("#fieldsetItemMultiple :checked").each(function() {
        respuestas.push($(this).val());
    });
    console.log(respuestas);
    respuestaEncuesta.push(respuestas);
    loadItem();
}

function loadItemTextual(it){
    $("#encuestaItemPanel").html("");
    var htmlInterior = "<label for='itemTextual'>"+it.titulo+"</label>";
    htmlInterior += "<textarea id='itemTextual'></textarea>";
    htmlInterior += '<a id="btItemTextual" data-role="button mini" onclick="checkItemTextual()">Siguiente</a>';
    $("#encuestaItemPanel").append(htmlInterior);
    $("#btItemTextual").button();
    $('#itemTextual').textinput();
}

function checkItemTextual(){
    var respuestas = []; 
    respuestas.push($("#itemTextual").val());
    console.log(respuestas);
    respuestaEncuesta.push(respuestas);
    loadItem();
 
}

function limpiarEncuesta(){
    $("#encuestaItemPanel").html("");
    $("#encuestaPanel").html("");
}

function irAPaginaError(){
    $(':mobile-pagecontainer').pagecontainer('change', '#paginaError', {
        transition: 'flip',
        changeHash: false,
        reverse: true,
        showLoadMsg: true
    });
}

function salir() {
    navigator.app.exitApp();
}