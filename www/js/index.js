
var app = {
    initialize: function() {
        this.bindEvents();
    },
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    onDeviceReady: function() { 
        app.receivedEvent('deviceready');
        
    },
    // Update DOM on a Received Event
    receivedEvent: function(id) { 
           familiaApp.inicializar(); 
    }    
}; 

var familiaApp = ( function(){

var server = "";
var alumnoId = "";
var store;
var deviceType;
var familiar;
var encuesta;
var itemActualEncuesta = 0;
var respuestaEncuesta;
var videoData = {};
var comunicados = [];

//Si ya existe el archivo lo muestra para reproducir.
var checkAndLoadFile = function(ruta, clave){

    var v = "";
    if (deviceType == "iPhone"){
        v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
    }    
    else if (deviceType == "Android"){
                var ext = ruta.split('.').pop();
                if (ext == 'MOV'){
                    v += "<video width=\"100%\" class='video-js' height=\"auto\" autoplay controls preload='auto' data-setup=\"{}\">";
                }
                else{
                    v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
                }
    }
        v += "<source id='videoup' src='" + ruta + "' type='video/mp4'>";
        v += "<source id='videoup' src='" + ruta + "' type='video/webm'>";
        v += "</video><p>Título: "+videoData[clave].nombre+"</p>";
        v += "<p>Descripción: "+videoData[clave].descripcion+"</p>";
    $("#verVideo").html(v);
    $("video").focus();
};

//Si no existe el archivo, primero lo descargo del servidor.
var downloadFileAndLoad = function(nombreArchivo, clave){
    $("#esperarModalContenidosMensaje").html("Descargando...");
    $("#esperarModalContenidos").css("display", "block");
    //Pido plugin FileTransfer.    
    var fileTransfer = new FileTransfer();
    var uri = encodeURI(server+"/"+nombreArchivo);
    var fileURL = store + nombreArchivo;
    //Descargaremos el archivo. En caso de ser extensión .mov y el dispositivo tenga
    //SO Android, lo reproduciremos con video.js. En el resto de los casos usamos html5.
    fileTransfer.download(
        uri,
        fileURL,
        function(entry) {
            var v = "";
            if (deviceType == "iPhone"){
                v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
            }  
            else if (deviceType == "Android"){
                var ext = nombreArchivo.split('.').pop();
                if (ext == 'MOV'){
                    v += "<video width=\"100%\" class='video-js' height=\"auto\" autoplay controls preload='auto' data-setup=\"{}\">";
                }
                else{
                    v += "<video width=\"100%\" height=\"auto\" autoplay controls='controls'>";
                }
            }            
            v += "<source id='videoup' src='" + fileURL + "' type='video/mp4'>";
            v += "<source id='videoup' src='" + fileURL + "' type='video/webm'>";
            v += "</video><p>Título: "+videoData[clave].nombre+"</p>";
            v += "<p>Descripción: "+videoData[clave].descripcion+"</p>";
            $("#verVideo").html(v);
            $("#esperarModalContenidos").css("display", "none");
            $("video").focus();

        },
        function(error) {
            $("#esperarModalContenidosMensaje").html("Error en la descarga");
        },
        false,
        {
            headers: {

            }
        }
    );
    
};

//Carga un item de muchas posibles elecciones en la encuesta.
var loadItemMultiple = function(it){
    $("#encuestaItemPanel").html("");
    var htmlInterior = "<fieldset id='fieldsetItemMultiple' data-role='controlgroup'>";
    htmlInterior += "<legend>"+it.titulo+"</legend>";
    $.each(it.items, function( key, val ) {
       htmlInterior += "<label for='"+key+"'>"+val.etiqueta+"</label>"; 
       htmlInterior += "<input class='itcheckbox' type='checkbox' id='"+key+"' value='"+val.valor+"'/>";
    });
    htmlInterior +="</fieldset><hr />";
    htmlInterior += '<a id="btItemMultiple" data-role="button mini" onclick="familiaApp.checkItemMultiple()">Siguiente</a>';
    $("#encuestaItemPanel").append(htmlInterior);
    $("#btItemMultiple").button();
    $('.itcheckbox').checkboxradio();
};

//Carga un item de una sola respuesta en la encuesta.
var loadItemCheckbox = function(it){
    $("#encuestaItemPanel").html("");
    var htmlInterior = "<fieldset id='fieldsetItemMultiple' data-role='controlgroup'>";
    htmlInterior += "<legend>"+it.titulo+"</legend>";
    $.each(it.items, function( key, val ) {
       if (key === 0){
         htmlInterior += "<input type='radio' name='radiochoice' id='"+key+"' value='"+val.valor+"' checked='checked'/>";
       } 
       else{
        htmlInterior += "<input type='radio' name='radiochoice' id='"+key+"' value='"+val.valor+"'/>";
       }
       htmlInterior += "<label for='"+key+"'>"+val.etiqueta+"</label>"; 
    });
    htmlInterior +="</fieldset><hr />";
    htmlInterior += '<a id="btItemMultiple" data-role="button mini" onclick="familiaApp.checkItemCheckbox()">Siguiente</a>';
    $("#encuestaItemPanel").append(htmlInterior);
    $("#btItemMultiple").button();
    $('[type="radio"]').checkboxradio();
};

//Carga un item de respuesta libre en la encuesta.
var loadItemTextual = function(it){
    $("#encuestaItemPanel").html("");
    var htmlInterior = "<label for='itemTextual'>"+it.titulo+"</label>";
    htmlInterior += "<textarea id='itemTextual'></textarea>";
    htmlInterior += '<a id="btItemTextual" data-role="button mini" onclick="familiaApp.checkItemTextual()">Siguiente</a>';
    $("#encuestaItemPanel").append(htmlInterior);
    $("#btItemTextual").button();
    $('#itemTextual').textinput();
};

//Convierte un string con fecha UTC en un string del formato dd/mm/yyyy, 
//teniendo en cuenta la zona horaria
var convertirFecha = function (fechaDelServidor){
    var d = new Date(fechaDelServidor);
    var anio = d.getFullYear();
    var mes = d.getMonth() + 1;  //los meses comienzan en cero
    var dia = d.getDate();
    if(dia < 10){
        dia = "0" + dia;
    }
    if(mes < 10){
        mes = "0" + mes;
    }
    return dia + "/" + mes + "/" + anio;
};


//API FAMILIA MOLINETE
return {

//Función que inicializa las variables principales de la aplicación.    
inicializar :function(){
    //Ruta donde se encuentra el archivo de configuración.
    $.getJSON("js/conf.json", function(result){
        $.getJSON(result.host, function(result1){
            //Pido el servidor.
            server = result1.host;
            //Determino el sistema.
            deviceType = (navigator.userAgent.match(/iPad/i))  == "iPad" ? "iPad" : (navigator.userAgent.match(/iPhone/i))  == "iPhone" ? "iPhone" : (navigator.userAgent.match(/Android/i)) == "Android" ? "Android" : (navigator.userAgent.match(/BlackBerry/i)) ==  "BlackBerry" ? "BlackBerry" : "null";
            //Dependiendo del sistema setea storage.
            if (deviceType == "iPhone"){
                store = cordova.file.documentsDirectory;
            }
            else if (deviceType == "Android"){
                store = cordova.file.externalDataDirectory;
            }
            //Chequeo que el móvil sea autorizado.
            $.get( server+"/checkAuth/familiares/"+device.uuid, function( data ) {
                if (data == 'noautorizado'){ 
                    $(':mobile-pagecontainer').pagecontainer('change', '#login', {
                        transition: 'flip',
                        changeHash: false,
                        reverse: true,
                        showLoadMsg: true
                    });
                }
                else{
                    //Es autorizado, pido el familiar asociado.
                    $.getJSON( server+"/getFamiliar/"+device.uuid, function( data ) {
                        familiar = data;
                        familiaApp.loadAlumnosDeFamiliar(); 
                    });   
                }
            }).fail(function(jqXHR, textStatus, errorThrown) {
                familiaApp.irAPaginaError();
            });
        });
    });
}, 
//Función donde el familiar autentica sus datos.
ingresar :function(){
    var error = false;
    var ci = $("#cifamiliar").val();
    var codigo = $("#code").val();
    if (ci === '' || ci === null){
        $("#cifamiliarerror").val("Debe ingresar este campo.");
        error = true;
    }
    if (codigo === '' || codigo === null){
        $("#codeerror").val("Debe ingresar este campo.");
        error = true;
    }
    if (!error){ 
        //Chequea correctitud de datos en servidor.
         $.get( server+"/ingresar/familiares/"+ci+"/"+device.uuid+"/"+codigo, function( data ) {
            if (data == 'ok'){
               $(':mobile-pagecontainer').pagecontainer('change', '#start', {
                transition: 'flip',
                changeHash: false,
                reverse: true,
                showLoadMsg: true
                });
                $.getJSON( server+"/getFamiliar/"+device.uuid, function( data1 ) {
                    familiar = data1;
                    familiaApp.loadAlumnosDeFamiliar(); 
                });
            } 
        }).fail(function(jqXHR, textStatus, errorThrown) {

            if(jqXHR.status == 500) {
                $(':mobile-pagecontainer').pagecontainer('change', '#loginError', {
                    transition: 'flip',
                    changeHash: false,
                    reverse: true,
                    showLoadMsg: true
                });
            } else {
                familiaApp.irAPaginaError();
            }
        });
     } 
},
//Carga de alumnos asociados al familiar.
loadAlumnos: function(){
    $.getJSON( server+"/verColeccion/alumnos", function( data ) {
        var alumnosListHTML = "";
        $.each( data, function( key, val ) {
            alumnosListHTML += "<option  value='"+val._id+"'>"+val.nombres+" "+val.apellidos+"</option>";
        });
        $("#alumnosList").html("");
        $("#alumnosList").html(alumnosListHTML);
        $("#alumnosList").selectmenu("refresh");

    }).fail(function(jqXHR, textStatus, errorThrown) {
        familiaApp.irAPaginaError();
    });
},
//Carga de alumnos asociados al familiar.
loadAlumnosDeFamiliar: function(){
    $.getJSON( server+"/alumnosDeFamiliar/"+familiar._id, function( data ) {
        var alumnosListHTML = "";
        $.each( data, function( key, val ) {
            alumnosListHTML += "<option  value='"+val._id+"'>"+val.nombres+" "+val.apellidos+"</option>";
        });
        $("#alumnosList").html("");
        $("#alumnosList").html(alumnosListHTML);
        $("#alumnosList").selectmenu("refresh");

    }).fail(function(jqXHR, textStatus, errorThrown) {
        familiaApp.irAPaginaError();
    });
},

//Carga los videos asociados a un alumno.
loadVideosAlumno: function(){
    $('#imagenPanel').css("display", "none");
    $('#comunicadosPanel').css("display", "none");
    $("#ulVideo").html("");
    $('#videosPanel').css("display", "block");
    //Pide todos los videos asociados.
    $.getJSON( server+"/contenidosDeAlumno/Video/"+alumnoId, function( data ) {
        videoData = data;
        var htmlInterior = "";
        $("#videosTexto").empty();
        if(data.length === 0){
            htmlInterior += "<p>No hay videos para mostrar</p>";
            $("#videosTexto").append(htmlInterior);
        } else {
            //Hay uno o más videos.
            $.each( data, function( key, val ) {
                var fechaString = convertirFecha(val.fecha);
                htmlInterior = "<li class='videolink ui-btn ui-shadow ui-corner-all' data-icon='bullets' key='"+key+"' file='"+val.nombreArchivo+"''>";
                    htmlInterior += "<a style='color:white;'>"+val.nombre+" - "+fechaString+" ►</a>";
                htmlInterior += "</li>";
                $("#ulVideo").append(htmlInterior);

            });   
            //Cargo los comportamientos de clases. 
            //Comportamiento asociado a hacer click en un elmento de la lista de videos.
            $( ".videolink" ).on( "click", function() {
                familiaApp.checkFileInMobile($( this ).attr("key"));
            });
        }
    }).fail(function(jqXHR, textStatus, errorThrown) {
        familiaApp.irAPaginaError();
    });
},

//Chequea si un archivo existe en el celular o no.
//Determina que hacer en cada caso (cargarlo o descargarlo).
checkFileInMobile : function(clave){

    var fileName = videoData[clave].nombreArchivo;
    window.resolveLocalFileSystemURL(store + fileName,                                
            function(fileEntry){ 
                checkAndLoadFile(store+fileName, clave);
            },
            function(error){
                downloadFileAndLoad(fileName, clave);
            });

},

//Carga las imágenes asociados a un alumno.
loadImagenesAlumno: function(){
    console.log(alumnoId);
    $('#videosPanel').css("display", "none");
    $('#comunicadosPanel').css("display", "none");
    $('.imagenGaleria').html("");
    $('#imagenPanel').css("display", "block");
    $.getJSON( server+"/contenidosDeAlumno/Imagen/"+alumnoId, function( data ) {
        var htmlInterior = "";
        if(data.length === 0){
            htmlInterior += "<p>No hay imágenes para mostrar</p>";
            $('.imagenGaleria').append(htmlInterior);
        } else {
            //Existe una o más imágenes asociadas al alumno.
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
                $("#imagenPopupModal").css("display", "block");
                $("#imagenPopup").attr("src", $(this).children("img").attr("src"));
                $("#caption").html = "Probando";
                $(".close").click(function(){
                    $("#imagenPopupModal").css("display", "none");
                });
            }); 
        }           
    }).fail(function(jqXHR, textStatus, errorThrown) {
        familiaApp.irAPaginaError();
    });
},

//Limpia todos los contenedores html
empezar: function(){
    $("#verVideo").empty();
    $("#imagenGaleria").empty();
    $("#comunicadosPagina").empty();
    $('#imagenPanel').css("display", "none");
    $('#comunicadosPanel').css("display", "none");  
    $('#videosPanel').css("display", "none"); 
    alumnoId = $("#alumnosList").val();
    $("#alumnoName").html($("#alumnosList").children('option:selected').html());
    $( "#fichaDiariaPanel" ).html("");
},

//Carga los comunicados asociados a un alumno.
loadComunicadosAlumno: function(){
    $('#videosPanel').css("display", "none");
    $('#imagenPanel').css("display", "none");    
    $('#comunicadosPanel').css("display", "block");
    //Pide comunicados al servidor.
    $.getJSON( server+"/contenidosDeAlumno/Comunicado/"+alumnoId, function( data ) {
        if(data.length === 0){
            var htmlInterior = "";
            htmlInterior += "<p>No hay comunicados para mostrar</p>";
            $('#comunicadosPagina').empty(htmlInterior);
            $('#comunicadosPagina').append(htmlInterior);
        
        } else {
            //Existe uno o más comunicados.
            comunicados = data;
            //Mostrar los 3 comunicados mas recientes.
            familiaApp.mostrarMasComunicados(false); 
        }

    }).fail(function(jqXHR, textStatus, errorThrown) {
        familiaApp.irAPaginaError();
    });
},

//Muestra comunicados anteriores.
mostrarMasComunicados: function(mostrarTodos) {
    var htmlInterior = "";
    var cantidad;
    var mensajeBoton;
    var total;

    total = Object.keys(comunicados).length;
    if(mostrarTodos) {
        cantidad = total;
        mensajeBoton = "Mostrar menos";
    } else {
        cantidad = 3;
        mensajeBoton = "Mostrar anteriores";
    }

    for (var i = 0; i < cantidad; i++) {
        if(i < total) {
            htmlInterior += "<hr /><p><b>" + convertirFecha(comunicados[i].fecha) + " - " + comunicados[i].titulo + "</b></p>";
            htmlInterior += "<p><i>"+comunicados[i].cuerpo+"</i></p>";
        } else {
            i = cantidad; // Para que termine
        }
    }
    // Si hay 3 comunicados o menos, no es necesario el boton para mostrar mas.
    if(total > 3) { 
        htmlInterior += '<hr /><a id="btMostrarMas" class="ui-btn ui-shadow ui-corner-all" data-role="button mini" onclick="familiaApp.mostrarMasComunicados('
            + !mostrarTodos + ')">' + mensajeBoton + '</a>';
    }
    $('#comunicadosPagina').empty();
    $('#comunicadosPagina').append(htmlInterior);  
},

//Pide la ficha diaria de un alumno para una fecha determinada.
fichaDiariaAlumno: function(){
    $( "#fichaDiariaPanel" ).html("");
    if ($("#asistenciarioDate").val() === ""){
        var htmlFichaDiaria = "<p style='color: red'>Debe seleccionar una fecha.</p>";
        $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
    }
    else{
        //En caso de completar correctamente el formulario, pide la ficha al servidor.
        $.getJSON( server+"/getAsistenciarioAlumno/"+alumnoId+"/"+$("#asistenciarioDate").val(), function( data ) {
            var htmlFichaDiaria = "";
            if(data) {
                 htmlFichaDiaria += "<p><b>"+data.alumno.nombres+" "+data.alumno.apellidos+"</b></p>";
                 $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 //Trabaja primero con el horario de entrada y de salida.
                 if (data.entrada !== null){
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
                 if (data.salida !== null){
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
                 //Revisa cada uno de los sucesos, y en caso que existan los procesa adecuadamente.
                 if (data.panhales !== null){
                    var pan = JSON.parse(data.panhales);
                    htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"panhalesTabla\"><tr><td style=\"color: #48a4ff\">Pañales</td></tr>";
                    htmlFichaDiaria += "<tr><td>Cant.Cambios</td><td>Orinó</td><td>Evacuó</td></tr>";
                    htmlFichaDiaria += "<tbody><tr><td>"+pan.veces+"</td><td>"+pan.orino+"</td><td>"+pan.evacuo+"</td></tr></tbody></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 }
                if (data.mamaderas !== null){
                    var mam = JSON.parse(data.mamaderas);
                    htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"mamaderasTabla\"><tr><td style=\"color: #48a4ff\">Mamaderas</td></tr>";
                    htmlFichaDiaria += "<tr><td>Mililitros</td><td>Tomas diarias</td></tr>";
                    htmlFichaDiaria += "<tbody><tr><td>"+mam.mililitros+"</td><td>"+mam.tomas+"</td></tr></tbody></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 }
                 if (data.almuerzo !== null){
                    var alm = JSON.parse(data.almuerzo);
                    htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"almuerzoTabla\"><tr><td style=\"color: #48a4ff\">Almuerzo</td>";
                    htmlFichaDiaria += "<td>"+alm.comportamiento+"</td></tr></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 }     
                 if (data.postre !== null){
                    var alm = JSON.parse(data.postre);
                    htmlFichaDiaria = "<table data-role=\"table\" id=\"postreTabla\"><tr><td style=\"color: #48a4ff\">Postre</td>";
                    htmlFichaDiaria += "<td>"+alm.comportamiento+"</td></tr></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 }  
                 if (data.merienda !== null){
                    var alm = JSON.parse(data.merienda);
                    htmlFichaDiaria = "<table data-role=\"table\" id=\"meriendaTabla\"><tr><td style=\"color: #48a4ff\">Merienda</td>";
                    htmlFichaDiaria += "<td>"+alm.comportamiento+"</td></tr></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 }   
                 if (data.siesta !== null){
                    var sis = JSON.parse(data.siesta);
                    htmlFichaDiaria = "<table data-role=\"table\" id=\"siestaTabla\"><tr><td style=\"color: #48a4ff\">Siesta</td>";
                    htmlFichaDiaria += "<td>"+sis.minutos+" minutos</td></tr></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 }            
                 if (data.nota !== null){
                    htmlFichaDiaria = "<hr /><table data-role=\"table\" id=\"siestaTabla\"><tr><td style=\"color: #48a4ff\">Nota</td></tr>";
                    htmlFichaDiaria += "<tr><td><i>"+data.nota+"</i></td></tr></table>";
                    $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
                 }
            } else {
                htmlFichaDiaria = "<p>No existen registros para ese día.</p>";
                $( "#fichaDiariaPanel" ).append(htmlFichaDiaria);
            }                                   

        }).fail(function(jqXHR, textStatus, errorThrown) {
            familiaApp.irAPaginaError();
        });
    }

},

//Carga las encuestas activas y asociadas al familiar.
loadEncuestas: function(){
    $("#encuestasPanel").html("");
    $.getJSON( server+"/encuestasFamiliar/"+familiar._id, function( data ) {
        var htmlInterior = "";
        $("#encuestasPanel").empty();
        if(data.length > 0){
            $.each( data, function( key, val ) {
                htmlInterior += "<a href='#' class='encuestaLink' id='"+val._id+"' >"+val.nombre+"</a><br />";
            });
        } else {
            htmlInterior = "<p>No hay nuevas encuestas.</p>";
        }
        $("#encuestasPanel").append(htmlInterior);
        //Carga comportamiento a la hora de elegir una encuesta.
        $(".encuestaLink").click(function(){
            $("#navBarButtons1").css("display", "block");
            $("#navBarButtons2").css("display", "none");
            //Pide los datos de la encuesta seleccionada.
            $.getJSON( server+"/encuesta/"+$(this).attr("id"), function( data1 ) {
                $("#encuestaPanel").append("<p>"+data1.descripcion+"</p>");
                itemActualEncuesta = 0;
                respuestaEncuesta = [];
                encuesta = data1;
                $(':mobile-pagecontainer').pagecontainer('change', '#encuestaPage', {
                    transition: 'flip',
                    changeHash: false,
                    reverse: true, 
                    showLoadMsg: true
                });
            }).fail(function(jqXHR, textStatus, errorThrown) {
                familiaApp.irAPaginaError();
            });
        });

    }).fail(function(jqXHR, textStatus, errorThrown) {
        familiaApp.irAPaginaError();
    });
},

//Toma los campos no procesados de la encuesta y despliega el primero seleccionando
//a que función darle el control a través del tipo de la encuesta.
loadItem: function(){
    //Si aún quedan items por responder.
    if (itemActualEncuesta < encuesta.itemsencuesta.length){
        var itemEncuesta = encuesta.itemsencuesta[itemActualEncuesta];
        itemActualEncuesta = itemActualEncuesta + 1;
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
    //Se respondió cada uno de los items.
    else{
        $("#encuestaPanel").html("<p>Gracias por responder.</p>");
        $("#encuestaItemPanel").html("");
        $("#navBarButtons2").css("display", "block");
        $("#navBarButtons1").css("display", "none");
        var url = server+"/subirRespuestaEncuesta/"+encuesta._id+"/"+familiar._id;
        var respuestaFinal = {"respuesta" : respuestaEncuesta};
        $.post(url,respuestaFinal,'json');
    }
},

//Proceso un item con múltiple respuestas.
checkItemMultiple : function(){
    var respuestas = [];
    $("#fieldsetItemMultiple :checked").each(function() {
        respuestas.push($(this).val());
    });
    //Agrega la respuesta.
    respuestaEncuesta.push(respuestas);
    familiaApp.loadItem(); 
},

//Proceso un item con una única respuesta aceptada.
checkItemCheckbox :function(){
    var respuestas = [];
    $("#fieldsetItemMultiple :checked").each(function() {
        respuestas.push($(this).val());
    });
    //Agrega la respuesta.
    respuestaEncuesta.push(respuestas);
    familiaApp.loadItem();
},

//Procesa un item con respuesta libre.
checkItemTextual : function(){
    var respuestas = []; 
    respuestas.push($("#itemTextual").val());
    respuestaEncuesta.push(respuestas);
    familiaApp.loadItem();
 
},

//Limpia los paneles de la encuesta.
limpiarEncuesta: function(){
    $("#encuestaItemPanel").html("");
    $("#encuestaPanel").html("");
},

//Lleva a la página de error.
irAPaginaError: function(){
    $(':mobile-pagecontainer').pagecontainer('change', '#paginaError', {
        transition: 'flip',
        changeHash: false,
        reverse: true,
        showLoadMsg: true
    });
},
salir : function() {
    navigator.app.exitApp();
}

} //END API


})();
