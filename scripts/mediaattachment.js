var ma = { };
ma.files = [];
ma.conf = { };
ma.uploadFiles = [];
ma.uploadTimeout = null;
ma.lang = {};
ma.ns = [];

ma.onClickFile = function(event) {
  insertAtCarret('wiki__text', '{{:'+event.data.id+'|}}');
}

ma.onDeleteFile = function(event) {
  var str = ma.lang.deleteconfirm;
  str = str.replace(/%name%/g, event.data.name);
  str = str.replace(/%id%/g, event.data.id);
  if (!confirm(str)) {
    return;
  }
  var sectok = jQuery('input[name=sectok]').val();
  var data = new FormData();
  data.append( 'call' , 'mediaattachment_deletefile' );
  data.append( 'delete' , event.data.id );
  data.append( 'sectok' , sectok );
  jQuery.ajax({
    url: DOKU_BASE + 'lib/exe/ajax.php',
    data: data,
    cache: false,
    contentType: false,
    processData: false,
    type: 'POST',
    error: function (jqXHR, textStatus, errorThrown) { alert(ma.lang.deletefailed); },
    success: function(data){
      self.clearTimeout(ma.uploadTimeout);
      ma.uploadTimeout = self.setTimeout(ma.refreshList, 500);
      if (data.msg) {
        alert(data.msg);
      }
      if (data.error) {
        alert(data.error);
      }
    }
  });
}

ma.refreshList = function() {
  jQuery.post(
      DOKU_BASE + 'lib/exe/ajax.php',
      { 'call' : 'mediaattachment_listfiles', 'ns' : ma.conf.id },
      function(data) {
        ma.files = data.files;
        ma.ns = data.ns;
        ma.repaintList();
      }
  );
}

ma.repaintList = function() {
  if (jQuery('img.ace-toggle[src*="on"]:visible').length > 0) { // ACE is enabled
    currentHeadlineLevel('wiki__text'); // workaround triggering ACE to update textarea
  }
  var val = jQuery('#wiki__text').val();
  ma.elemlist.empty();
  for (var i = 0, f; f = ma.files[i]; i++) {
     var li = jQuery('<li/>');
     jQuery('<a/>').attr('href',f.link).attr('target','_blank').text(ma.lang.download).appendTo(li);
     li.append(" ");
     var notInUse = ((val.indexOf('{{:' + f.id + '|') == -1) && (val.indexOf('{{:' + f.id + '?') == -1));
     if (notInUse) {
       jQuery('<span/>').text(ma.lang.delete).addClass("mediaattachment-delete").appendTo(li).click({'id' : f.id, 'name' : f.file}, ma.onDeleteFile);
       li.append(" ");
     }
     var desc = jQuery('<span/>').appendTo(li);
     desc.text(f.id);
     desc.addClass('mediaattachment');
     if (notInUse) {
       desc.addClass('mediaattachment-unused');
       desc.attr('title', ma.lang.unused);
     }
     desc.click({'id': f.id, 'name': f.file}, ma.onClickFile);
     li.appendTo(ma.elemlist);
  }
}

ma.onSelectFile = function(event) {
  ma.uploadFiles = event.target.files;
  var fl = jQuery('#mediaattachmentfilelist');
  fl.empty();

  var li = jQuery('<li/>').appendTo(fl).addClass('mediaattachmentuploadhead');
  jQuery('<span/>').text(ma.lang.uploaddlgoldname).appendTo(li);
  jQuery('<span/>').text(ma.lang.uploaddlgnewname).appendTo(li);
  jQuery('<span/>').text(ma.lang.uploaddlgoverwrite).appendTo(li);
  jQuery('<span/>').text(ma.lang.namespace).appendTo(li);

  var num=0;
  for (var i = 0, f; f = ma.uploadFiles[i]; i++) {
    var li = jQuery('<li/>').appendTo(fl);
    jQuery('<span/>').text(f.name).appendTo(li);
    jQuery('<input/>').attr('type','text').attr('value',f.name).attr('id','mediaattachment'+i).appendTo(jQuery('<span/>').appendTo(li));
    jQuery('<input/>').attr('type','checkbox').attr('value','1').attr('id','mediaattachmentow'+i).appendTo(jQuery('<span/>').appendTo(li));
    var sel = jQuery('<select/>').attr('size',1).attr('id','mediaattachmentns'+i).appendTo(jQuery('<span/>').appendTo(li));
    for (var j = 0, n; n = ma.ns[j]; j++) {
     jQuery('<option/>').text(n).attr('value',n).appendTo(sel);
    }
    sel.val(ma.conf.id);
    num++;
  }
  if (num > 0) {
    ma.dialog.dialog("open");
  }
}

ma.onConfirmUpload = function(event) {
  var sectok = jQuery('input[name=sectok]').val();
  for (var i = 0, f; f = ma.uploadFiles[i]; i++) {
    var data = new FormData();
    data.append( 'call' , 'mediaupload' );
    var name = jQuery('input#mediaattachment'+i).val();
    if (name == '') { name = f.name; }
    name = name.replace(/:/g,'_');
    data.append( 'mediaid' , name );
    var ns = jQuery('select#mediaattachmentns'+i).val();
    if (ns == '') { ns = ma.conf.id; }
    data.append( 'ns' , ns );
    data.append( 'qqfile' , f );
    data.append( 'sectok' , sectok );
    if (jQuery('input#mediaattachmentow'+i).attr('checked')) {
      data.append( 'ow' , '1' );
    }
    jQuery.ajax({
      url: DOKU_BASE + 'lib/exe/ajax.php',
      data: data,
      cache: false,
      contentType: false,
      processData: false,
      type: 'POST',
      error: function (jqXHR, textStatus, errorThrown) { alert(ma.lang.uploadfailed); },
      success: function(data){
        data = jQuery.parseJSON(data);
        self.clearTimeout(ma.uploadTimeout);
        ma.uploadTimeout = self.setTimeout(ma.refreshList, 500);
        if (data.error) {
          alert(data.error);
        }
      }
    });
  } // for
  ma.dialog.dialog("close");
}

ma.initialize = function() {
  ma.lang = LANG.plugins.mediaattachment;
  ma.conf = mediaattachment_config;
  ma.ns = [ma.conf.id];
  //ma.elem = jQuery('<div/>').attr('id','mediaattachment').appendTo(jQuery('#bodyContent'));
  ma.elem = jQuery('div#mediaattachment');
  jQuery('<h3/>').text(ma.lang.head).appendTo(ma.elem);
  var form = jQuery('<form/>').appendTo(ma.elem);
  form.append(jQuery('<span/>').text(ma.lang.upload));
  var upload = jQuery('<input type="file" multiple />').appendTo(form);
  ma.elemlist = jQuery('<ul id="mediaattachmentlist"></ul>').appendTo(ma.elem);
  upload.change(ma.onSelectFile);
  ma.refreshList();
  self.setInterval(ma.refreshList, 10000);
  self.setInterval(ma.repaintList, 1000);
  ma.dialog = jQuery('<div/>');
  ma.dialog.attr('id','mediaattachmentdialog').attr('title', ma.lang.uploaddlgtitle);
  ma.dialog.appendTo(ma.elem);
  ma.dialog.dialog({ autoOpen: false, modal: true, width: 1200, height: 400, buttons : { Ok : ma.onConfirmUpload, Cancel: function() { ma.dialog.dialog("close"); } } });
  jQuery('<h3/>').text(ma.lang.uploaddlghead).appendTo(ma.dialog);
  jQuery('<ul/>').attr('id', 'mediaattachmentfilelist').addClass('mediaattachmentupload').appendTo(ma.dialog);
};

jQuery(document).ready(ma.initialize);

