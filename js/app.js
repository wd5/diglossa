var Diglossa = (function($) {

  var locale = window.location.host.split('.')[0];
  var store = new Sammy.Store({name: 'dig', type: 'local'});
  var lite = new Sammy.Store({name: 'lite'});

  var app = $.sammy('#view_0', function() {
    
    //if($.support.opacity) { var audio = new Audio(); }
    this.use(Sammy.Template, 'tpl');
    this.use(Remote);
    var expire = "10.08.2012";  
    if (store.get('expire') != expire) {store.clearAll();store.set('expire', expire);}
    this.bind('page2', function(e, data) {twoPages(); });
    this.bind('page1', function(e, data) {onePage(); });
    this.bind('toggleWidth', function(e, data) {toggleWidth(); });
    this.bind('touch-bottom', function(e, data) {
      var context = this;
      getChunks(context, data);
    });
    this.bind('show-search-window', function(e, data) {
      var context = this;
      showSearch(context, data);
    });
    this.bind('show-morph-window', function(e, data) {
      var context = this;
      showMorphWindow(context);
    });

    this.get('^/:section$', function(context) {
      $('#loader').show();
      $('.header').hide();
      //twoPages(); 
      if ($('#panel').length == 0) {
        this.render('/templates/panel.tpl')
          .prependTo('#container');
      }
      var section = this.params['section'];
      this.load('templates/' +section+'_'+locale+'.tpl') 
        .then(function(content){$('#view_0').html(content)});
      $('#loader').hide();
    });

    // root
    this.get('^\/$', function(context) {
      $('#window').hide();
      $('#loader').show();
      twoPages();
      lite.clear('author');
      $('.header').hide();
      //$('#content-search').show();
      if ($('#panel').length == 0) {
        this.render('templates/panel.tpl')
          .prependTo('#container');
      }
      this.load('/templates/contents.tpl')
        .then(function(content){
          $('#view_0').html(content);
          context.getCouch('lib', 'lib-tree', function(stored){
            parseTree('#tree', stored, context);
            context.load('/templates/blazon.tpl')
              .then(function(content){$('#view_0').append(content)});
            context.load('/templates/help_'+locale+'.tpl')
              .then(function(content){store.set('help', content)});
            $('#loader').hide();
          });
        });
      this.load('/templates/about_'+locale+'.tpl')
        .then(function(content){
          $('#view_1').html(content);
          $("#about").dynatree({
            debugLevel: 0,
            onClick: function(node, event) {
              if(node.data.url){
                context.redirect(node.data.url);
                return false; 
              }}
          });
        });
    });

    // main: two pages
    this.get(/^\#*!*\/(.*)$/, function(context) {
      $('#window').empty().hide();
      if ($('#panel').length == 0) {
        this.render('/templates/panel.tpl')
          .prependTo('#container');
      }
      var path = this.params['splat'].join('/').replace('#', '').replace('!/', ''),
      split = path.split('/'),
      size = split.length,
      author = split[0].toLowerCase(); 
      twoPages(); 
      lite.set('path', path);
      lite.set('author', author);
      if (size == 2) setTitle(context, path);
      else {
        $('.header').addClass('border-bottom');        
        getPages(context, path, function(pars, current){
          var root = getRoot();
          if (pars[author]) $('#view_0').html(pars[author].join(''));
          else {
            $('#view_0').empty();
            $('#view_0').html(pars[current].join(''));
            _.each($('#view_0 p'), function(par){
              //$(par).empty();
              $(par).addClass('invisible');
            });
          }
          pars[current] ? $('#view_1').html(pars[current].join('')) : $('#view_1').empty();
          $('#view_0').scrollTop(0);
          $('#view_1').scrollTop(0);
          adjustAll(); 
          parseRightHeader(current);
          //$('#header_1').dynatree("getTree").reload();
          var data = store.get(root);
          parseTree('#header_0', data, context);
          $('#header_0').dynatree("getTree").reload();
          $("#header_0").dynatree("getRoot").visit(function(node){
            node.expand(false);
          });
          var now = new Date();
          now = now.format('isoDateTime');
          var counter = {time:now, path:path, current:current};
          context.pingCounter(counter);
          if (lite.exists('jump')){
            var pos = lite.get('jump'); 
            if (pos >0) jumpTo(pos);
          }

          $('#view_0').focus();
          $('#view_0 span.hl').removeClass('hl');
          if(i_am_not_old_ie) { audio = new Audio(); }
          if ($('#view_0 span.word').first().attr('vox')*1.0 >0){
            setVox(path);
          } else {
            $("#view_0").undelegate("span.word", "click");
          }
          if (path == 'Heidegger/Sein-und-Zeit/Glossarium') setSearchable(context); 
          showMorphs(context);
        });
      }
    });

    function getPages(context, path, callback){
      var root = path.split('/').slice(0,2).join('/');
      // if (!store.exists(root)){
      //   var q = '/by_book/' + encodeURIComponent(root);
      //   $.getJSON(q, function(json) {
      //     var data = json.rows[0].doc; 
      //     store.set(root, data);
      //   });
      // }
      var rpp = store.get(root).rpp[path] -1; 
      var authors = store.get(root).authors;
      if (lite.exists('jump')){
        var pos = lite.get('jump')*1;
        if (pos > rpp) rpp = rpp + pos;
      }
      context.getParagraphs(path, 0, rpp, function(docs){ 
        var groups = _.groupBy(docs, 'nic');
        var bare_nics = _.keys(groups);
        var current, info = {}, pars = {}, coms = {};
        info[path] = {};
        _.each(groups, function(docs, nic){
          pars[nic] = _.pluck(docs, 'par');
          coms[nic] = _.pluck(docs, 'coms');
          if (docs[0].lang == locale){current = nic;}
        });
        info[path].pars = pars;
        info[path].coms = coms;
        //info[path].bare_nics = bare_nics;
        var nics = bareNicsToNics(bare_nics, authors);
        info[path].nics = bareNicsToNics(bare_nics, authors);
        lite.set('info', info);
        lite.set('current', current);
        callback(pars, current);
      });
    };

    function setSearchable(context){
      $('span.search').bind("click",function(e){
        query = $(this).text();
        var luceneq = 'text:"' + query +'"'; 
        if (lite.exists('author')) {
          var author = lite.get('author');
          luceneq += 'AND+nic:'+author;
        }
        if (query == '') return false;
        context.getSearch(luceneq, function(rows){
          if (rows.length > 1) {
            showSearchResults(context, query, rows);
          }
          else {
            $('#query').val('no result');
          }
        });
      });
      // $('#view_1 span.toggle-hidden').eq(2).parent().next().toggle()
      $('#view_1 span.toggle-hidden').bind("click", function(e){
        $(this).parent().next().toggle();
      });
    }

    function getChunks(context, data){
      var path = lite.get('path'),
      root = getRoot(),
      rpp = store.get(root).rpp[path],
      last = data['pos']*1 +1, 
      next = last*1 + rpp*1 -1;
      path = encodeURIComponent(path);
      var query = '/by_page?startkey=["'+path+'",'+last+']&endkey=["'+path+'",'+next+']'; 
      $.getJSON(query, function(data){
        var docs = _.pluck(data.rows, 'doc');
        if (docs.length > 0 ) {addChunks(context, docs);}
      })
      .then(function(){
        $('#loader').hide();
      });
    };

    function addChunks(context, docs){
      var groups = _.groupBy(docs, 'nic'),
      info = lite.get('info'),
      path = lite.get('path'),
      pars = info[path].pars;
      _.map(groups, function(docs, nic){
        pars[nic] = pars[nic].concat(_.pluck(docs, 'par')); // FIXME ====
      });
      info[path].pars = pars;
      lite.set('info', info);
      var author = lite.get('author');
      var current = lite.get('current');
      if (pars[author]) $('#view_0').html(pars[author].join(''));
      else {
        $('#view_0').empty();
        $('#view_0').html(pars[current].join(''));
        _.each($('#view_0 p'), function(par){
          //$(par).empty();
          $(par).addClass('invisible');
        });
      }
      $('#view_1').html(pars[current].join(''));
      adjustAll();  // FIXME - adjustNew()
      showMorphs(context);
      if (path == 'Heidegger/Sein-und-Zeit/Glossarium') setSearchable(context); 
    }

    function setTitle(context, path){
      $('.header').empty().removeClass('border-bottom');
      $('#view_0').empty();
      context.load('/templates/contents.tpl')
        .then(function(content){
          $('#view_1').html(content);
          getBookTree(path, function(data){
            parseTree('#tree', data, context);
            var author = data[locale][0].author.name,
            title = data[locale][0].title;
            var transls = _.values(data.authors);
            transls = _.groupBy(transls, 'lang');
            var trs = {};
            _.each(transls, function(hash, lang){
              trs[lang] = _.pluck(hash, locale).join(', ');
            });
            context.book = {author:author, title:title, trs:trs};
            context.render('/templates/title.tpl', context.book)
              .appendTo($('#view_0'));
            context.load('/templates/blazon.tpl')
              .then(function(content){$('#view_0').append(content)});
          });
        });
    }

    function getBookTree(path, callback){
      var query = path.replace('!/','');
      if (store.exists(query)){
        var data = store.get(query);
        callback(data);
      } else {
        var q = '/by_book/' + encodeURIComponent(query);
        $.getJSON(q, function(json) {
          var data = json.rows[0].doc; 
          store.set(query, data); 
          callback(data);
        });     
      }
    }
    
    function parseRightHeader(current){
      $('#header_1').dynatree({
        debugLevel: 1,
        onClick: function(node, event) {
          if(node.data.key != 'root'){
            current = node.data.key;
            lite.set('current', current);
            changeTranslation(current);
            return false; 
          }
        },
        // onActivate: function(node) {
        // }, 
        children: folderForRightHeader(current) 
      });
      $('#header_1').dynatree("getTree").reload();
    }

    function folderForRightHeader(current){
      var folders = [], children = [], nics;
      var path = lite.get('path');
      var info = lite.get('info');
      //var root = getRoot(); 
      //var authors = store.get(root).authors;
      // if (!info[path].nics){
      //   nics = bareNicsToNics(info[path].bare_nics, authors);
      //   info[path].nics = nics;
      //   lite.set('info', info);
      // } 
      var nics = info[path].nics;
      _.map(nics, function(author, nic){
        if (current == nic) {folders.push({title:author.name, isFolder:true, key:'root'});}
        else {children.push({title:author.name, key:nic});}
      });
      folders[0]['children'] = children;
      return folders;
    }
    
    function bareNicsToNics(bare_nics, authors){
      var nics = {};
      var author = lite.get('author'); 
      _.each(bare_nics, function(nic){
        if (nic != author) {
          nics[nic] = {name:authors[nic][locale]};
        }
      });
      return nics;
    }

    function getRoot(){
      var path = app.getLocation().replace('#!/','').replace(/^\//,'');
      return path.split('/').slice(0,2).join('/');
    }

    function changeTranslation(current){
      var path = lite.get('path');
      var pars = lite.get('info')[path].pars; 
      parseRightHeader(current);
      $('#view_1').html(pars[current].join(''));
      adjustAll();
    }

    function parseTree(div, stored, context){
      $(div).dynatree({
        debugLevel: 0,
        onClick: function(node, event) {
          if(node.data.nics){
            var path = node.data.url;
            var info = lite.get('info') || {};
            info[path] = {};
            lite.set('path', path);
            info[path].nics = {nics:node.data.nics};
            lite.set('info', info);
          }

          if (node.data.addClass){
            lite.set('vox', true);
          } else {
            lite.clear('vox');
            $("#view_0").undelegate("span", "click");
          }
          if (node.data.url){
            context.redirect(node.data.url);
            return false; 
          }
        },
        // onActivate: function(node) {
        // }, 
        children: stored[locale] 
      });
    }

    function goHome(){
      window.location.href = '/';
    }

    function clearCaches_(){
      var bks = store.get('bookmarks');
      store.clearAll();
      store.set('bookmarks', bks);
    }
    
    function  toggleWidth(){
      if ($('#panel').css('display') == "block") {
        $('#pages').css('margin-right',0);
        $('#panel').hide();
        $('.header').css('width', '43%');
        adjustAll();
      }
      else {
        $('#pages').css('margin-right','180px');
        $('#panel').show();
        $('.header').css('width', '35%');
      }
    }
    function  twoPages(){ 
      $('.header').show();
      $('#page_0').addClass('page_0').show();
      $('#page_1').addClass('page_1').show(); // .addClass('page')
      $('.page').each(function(idx, page){
        if ($(page).attr('pos') >1)  $(page).hide();
      })
      //$('#view_1').empty();
    }
    function  onePage(){
      $('.header').hide();
      //$('#page').removeClass('page-left');
      $('#page_1').hide();
      $('#page_0').removeClass('page_0'); // .addClass('page')
    }

    function adjustAll(){
      $('#view_1 p.new').each(function(){
        var right = $(this),
        pos = $(this).attr('pos'),
        left = $('#view_0 p:eq('+pos+')');
        max = _.max([left.height(), right.height()]);
        left.height(max); 
        right.height(max);
      });
      $('p.new').removeClass('new');
      $('#loader').hide();
    }

    function adjustAll_(){
      var transl = $('#view-right p.new');
      $('#view p.new').each(function(index) {
        var left = $(this).height(),
        right = $(transl[index]).height()
        max = 0;
        max = (left > right) ? left : right;
        $(transl[index]).height(max); 
        $(this).height(max);
      });
      $('#loader').hide();
    }

    function getRef(context){
      $('#dict-ref').bind("click",function(e){
        var ref = $(this).text().replace(',', '').replace('.', ''); //trim().
        var keys = {"keys": [ref]};
        context.getDicts(keys, function(dicts){
          dicts = _.map(dicts, function(dict){ return dict;});
          $.each(dicts, function(idx, dict){
            showDict(context, dict);
          });
        });
      });
    }

    function showDict(context, dict){
      if (dict.ru){
        lines = dict.ru;
        if (lines.length == 1){var ru_first = lines[0];}
        else if (lines.length > 1){
          var ru_first = lines[0];
          var ru_tail = lines.slice(1).join('<br>');
        }
      }
      if (dict.en){
        lines = dict.en;
        if (lines.length == 1){var en_first = lines[0];}
        else if (lines.length > 1){
          var en_first = lines[0];
          var en_tail = lines.slice(1).join('<br>');
        }
      } 
      $('#results').empty();
      context.render('/templates/dicts.tpl', {dict:dict, ru_first:ru_first, ru_tail:ru_tail, en_first:en_first, en_tail:en_tail}).appendTo('#results')
        .then(function(){
          getRef(context); 
        });
    }

    function renderMorphHeader(context){
      $('#window').empty().show(); 
      addX();
      context.render('/templates/morph_header.tpl', {locale:locale}).appendTo('#window').
        then(function(){
          $('#query').focus();
          $('#morph-tool').bind("click",function(e){
            $('#results').empty();
            context.render('/templates/morph_tool.tpl', {}).appendTo($('#results'));
          });
          $('#morph-help').bind("click",function(e){
            $('#results').empty();
            context.render('/templates/morph_'+locale+'.tpl', {}).appendTo($('#results'));
          });
        });
    }
    
    function showMorphWindow(context){
      renderMorphHeader(context);
      context.render('/templates/morph_tool.tpl', {}).appendTo('#results').
        then(function(){
          $('#morph-form').bind("submit",function(e){
            var dict = $('input').val(); //.trim()
            if (dict == '') return false;
            var keys = {"keys": [dict]};
            showMorphsByKeys(context, keys, dict);
            return false;
          });
        })
    }

    function showMorphsByKeys(context, keys, word){
      renderMorphHeader(context);
      context.getWordForms(keys, function(docs){
        var forms = [];
        var dicts = [];
        // группировка вокруг word. Достать только word и word.with
        var pron_morphs = [];
        var pron_form, pron_dict;
        $.each(docs, function(idx, doc){
          if (doc.form == word) { // FIXME: целая история doc.with, etc
            forms.push(doc);
            dicts.push(doc.dict);
          }
        });
        dicts = _.uniq(dicts);
        if (dicts.length < 1) {
          $('#results').append("no result"); 
          return false;
        }
        var keys = {"keys": dicts};
        context.getDicts(keys, function(dicts){
          $.each(forms, function(idx, form){
            var descr = descrByPos(form);
            context.render('/templates/morphs.tpl', {form:form, descr:descr}).appendTo('#results');
            $.each(dicts, function(i, dict){
              if (form.dict == dict.dict && form.pos == dict.pos) { 
                showDict(context, dict);
              } else if ((form.dict == dict.dict) && form.pos == 'part' &&  dict.pos == 'verb'){
                showDict(context, dict);
              }
            }); 
          }); 
        }); // getDicts
      });
    }

    function descrByPos(form){
      var descr = '== no descr ==';
      if (form.pos == 'verb'){
        if (form.morphs){
          var morphs = [form.morphs.number, form.morphs.person].join(".");
        }
        descr = _.compact([form.pos, form.descr, morphs]).join(", ");
      } else if (_.include(['noun', 'adj', 'part', 'pron'], form.pos)){
        var descrs = [];
        var gends = _.groupBy(form.morphs, 'gend');
        _.each(gends, function(arr, gend){
          var morphs = [];
          _.each(arr, function(hash){
            morphs.push([hash.number, hash.kase].join("."));
          });
          descrs.push(gend + ': ' + morphs);
        });
        descr = _.compact([form.pos, form.grad, form.descr, descrs.join(", ")]).join(", ");
      } else if (_.include(['adv', 'conj'], form.pos)){
        descr = _.compact([form.pos, form.grad]).join(", ");
      } else if (_.include(['prep'], form.pos)){
        descr = _.compact([form.pos, form.prep.join(", ")]).join(", ");
      }
      return descr;
    }

    function showMorphs(context) {
      $('#view_0 span.word').not('[vox]').bind("click",function(e){ 
        var sentence = $(this).parent();
        var word = $(this).text().replace(/[\.,;:!\?\"]/g, ''); //trim().
        var words = sentence.text().replace(/[\.,;:!\?\"]/g, '').split(' '); //trim().
        // FIXME - but if first word is proper name?
        if (word == words[0]){
          word = word.toLowerCase()
        }
        words[0] = words[0].toLowerCase();
        words = _.uniq(words);
        var keys = {"keys": words};
        $('#window').empty().show(); 
        addX();
        showMorphsByKeys(context, keys, word);
      }); 
    }

    function emptyWindow(){
      if ($('#window').css('display') != "none") $('#window').empty(); 
      addX();
    }

    function showComments() {
      $('#view_1 p').live("click",function(e){
	if ($('#window').css('display') != "none") return;
	var pos = $(this).attr('pos');
	var coms_size = $(this).attr('coms');
	if ((coms_size == 0 ) || (coms_size == null )) return;
        $('#window').empty().show(); 
        addX();
        var current = lite.get('current'),
        path = lite.get('path'),
        info = lite.get('info'),
        coms = info[path].coms[current][pos];
        $('#window').append('<p><b class="maroon">'+coms[0].author[locale]+':</b></p>');
        $.each(coms, function(idx, com){
          $('#window').append('<p><b>'+com.anchor+'</b>: '+com.com+'</p>');
        });
      });
    }

    function addX(){
      if ($('#x').length == 0) {
	$('#window').prepend('<a href="#" onclick="Diglossa.closeAll();return false;"><span id="x" style="float:right">[x]</span></a>');
        $('#window').focus();
      }
    }

    function jumpTo(pos){ 
      var par = $('#view_0 p:eq('+pos+')');
      var parTop = par.position().top-100;
      $('#view_0').scrollTop(parTop);
      $('#view_1').scrollTop(parTop);
      var text = par.text();
      var query = lite.get('query');
      //par.find('span.word:contains("'+query+'")').addClass('maroon');
      highliter(query, par);
      lite.clear('jump');
      lite.clear('query');
    }

    function highliter(word, element) {
      var rgxp = new RegExp(word, 'g');
      var repl = '<span class="maroon">' + word + '</span>';
      element.html(element.html().replace(rgxp, repl));
    }

    function getBookmark(){
      $('#window').show('slow');
      $('#window').empty();
      addX(); 
      if (store.exists('bookmarks')) {
	var bookmarks = store.get('bookmarks');
	$.each(bookmarks, function(idx, bm){
          //id="bm_' + idx + '" 
	  var line = '<span class="bookmark right">[-]</span><a href="/'+bm.path+'" class="bookmark" pos="'+bm.pos+'" current="'+bm.current+'">' + bm.path + '</a>';
	  $('#window').append(line + '<br>');
	});
      }
      else $('#window').append('click on any paragraph');
    }

    $('#view_1 p').live('click', function(){
      if ($('#window').css('display') == "none") return;
      var bookmarks = store.get('bookmarks') || [];
      var pos = $(this).attr('pos'),
      path = lite.get('path'),
      current = lite.get('current'),
      bookmark = {path:path, current:current, pos:pos}; 
      var can = !_.include(bookmarks, bookmark);
      if (can) {bookmarks.push({path:path, pos:pos, current:current})};
      store.set('bookmarks', bookmarks);
      getBookmark();
    });

    $('a.bookmark').live('click', function(){
      var pos = $(this).attr('pos');
      var current = $(this).attr('current');
      lite.set('current', current);
      lite.set('jump', pos);
      Diglossa.closeAll(); 
    });

    // remove bookmark
    $('.bookmark.right').live('click', function(){
      var bookmark = $(this).next().text();
      var bookmarks = store.get('bookmarks') || [];
      _.each(bookmarks, function(bk, idx){
	if (bk.path == bookmark) {
	  bookmarks.splice(idx, 1);
	}
      });
      store.set('bookmarks', bookmarks);
      getBookmark();
    });


    $('#view_0').scroll(function() {
      var top = $('#view_0').scrollTop();
      $('#view_1').scrollTop(top);
      touchBottom();
    });

    $('#view_1').bind('mousewheel', function(event, delta) {
      Diglossa.closeAll();
      if (event.shiftKey == true){
        var pos = $(event.target).attr('pos'),
        path = lite.get('path'),
        info = lite.get('info'),
        nics = info[path].nics,
        pars = info[path].pars,
        mouse = lite.get('mouse') || 1,
        keys = _.keys(nics),
        size = keys.length,
        current = keys[mouse%size];
        mouse +=1;
        lite.set('mouse', mouse);

        var text = $(pars[current][pos]).text();
        $('#view_1 p:eq('+pos+')').text(text);

        $('#view_1 p:eq('+pos+')').height('auto');
        var lh = $('#view_0 p:eq('+pos+')').height();
        var rh = $('#view_1 p:eq('+pos+')').height();
        var max = _.max([lh,rh]);
        $('#view_0 p:eq('+pos+')').height(max);
        $('#view_1 p:eq('+pos+')').height(max);
      } else {
        var s = $('#view_1').scrollTop()*1; 
        $('#view_1').scrollTop(-delta*50+s);
        $('#view_0').scrollTop(-delta*50+s);
      }
      return false;
    });

    function touchBottom() {
      if ($('#view_0 .text').length == 0) return;
      var $last = $('#view_0 .text:last');
      var viewBottom = $('#view_0').offset().top + $('#view_0').height();
      var lastBottom = $last.offset().top  + $last.height();
      var pos = $last.attr('pos'); 
      result = (lastBottom <= viewBottom +1); // FIXME - why 1?
      if (result) {
        lite.clear('jump');
        $('#loader').show();
        app.trigger('touch-bottom', {pos: pos}); 
        return false; 
      }
    }

    $('#view_0').bind('mousewheel', function(event, delta) {
      Diglossa.closeAll();
      if (event.shiftKey == true){
        return false;
      } 
      //return false;
    });

    function showHelp(){
      $('#window').show('slow');
      $('#window').empty();
      addX(); 
      if (store.exists('help')) {
	var help = store.get('help');
        $('#window').append(help);
        return false;
      }
      $('#window').focus();
    }

    function showSearch(context){
      $('#window').show('slow');
      $('#window').empty();
      addX(); 
      context.render('/templates/search_form.tpl', {})
        .appendTo($('#window')).then(function(){
          $('#query').focus()
          $('#search-form').bind("submit",function(e){
            var query = $('input').val(); 
            var luceneq = 'text:"' + query +'"'; 
            if (lite.exists('author')) {
              var author = lite.get('author');
              luceneq += 'AND+nic:'+author;
            }
            if (query == '') return false;
            context.getSearch(luceneq, function(rows){
              if (rows.length > 1) {
                showSearchResults(context, query, rows);
              }
              else {
                $('#query').val('no result');
              }
            });
            return false;
          });
        });
    }

    function showSearchResults(context, query, rows){
      $('#window').show('slow');
      $('#window').empty();
      addX(); 
      context.render('/templates/search_results.tpl', {query:query, rows:rows})
        .appendTo($('#window')).then(function(){
          $('.search-results-link li').bind('click', function(event){
            if (event.target.nodeName == 'LI') {
              var url = $(event.target).find('.url').text();
              var pos = $(event.target).find('.pos').text();
            } else {
              var url = $(event.target).parent().find('.url').text();
              var pos = $(event.target).parent().find('.pos').text();
            }
            lite.set('jump', pos);
            lite.set('query', query);
            // setting lite data: current, path, nics, etc and redirect:
            lite.set('path', url);
            var root = url.split('/').slice(0,2).join('/');
            var data;
            var author = lite.get('author');
            if (!author){
              author = url.split('/')[0].toLowerCase(); 
              lite.set('author', author);
            }
            store.clearAll();
            getBookTree(root, function(data){
              store.set(root, data);
              var info = {};
              var bare_nics = _.keys(data['authors']);
              var nics = bareNicsToNics(bare_nics, data["authors"]);
              info[url] = {nics: nics};
              lite.set('info', info);
              context.redirect(url);
            });
          });
        });
    }


    $(document).bind('keydown', 'esc',function (evt){$("input").blur();Diglossa.closeAll(); return false; });
    $(document).bind('keydown', '2',function (evt){app.trigger('page2'); return false; });
    $(document).bind('keydown', '1',function (evt){app.trigger('page1'); return false; });
    $(document).bind('keydown', 'w',function (evt){app.trigger('toggleWidth'); return false; });
    //$(document).bind('keydown', 'Ctrl+delete',function (evt){store.clearAll(); lite.clearAll(); return false;});
    $(document).bind('keydown', 'Ctrl+z',function (evt){store.clearAll(); lite.clearAll(); });
    $(document).bind('keydown', 'a',function (evt){$('#view_0').scrollTop(0); return false; });
    $(document).bind('keydown', 'Ctrl+a',function (evt){$('#view_0').scrollTop(0); return false; });
    $(document).bind('keydown', 'e',function (evt){$('#view_0').scrollTop(1000000); return false; });
    $(document).bind('keydown', 'Ctrl+e',function (evt){$('#view_0').scrollTop(1000000); return false; });
    $(document).bind('keydown', 'b',function (evt){getBookmark(); return false; });
    $(document).bind('keydown', 'Ctrl+home',function (evt){window.location.href = '/';return false;});
    $(document).bind('keydown', 'Ctrl+h', function(e, data) {showHelp(); return false; });
    $(document).bind('keydown', 'h', function(e, data) {showHelp(); return false; });
    $(document).bind('keydown', 'f', function(e, data) {app.trigger('show-search-window', {}); return false; });
    $(document).bind('keydown', 'm', function(e, data) {app.trigger('show-morph-window', {}); return false; });

    showComments();

    // Sound
    function hlWord(idx){
      $('#view_0 span.hl').removeClass('hl');
      $('#view_0 span.word:eq('+idx+')').addClass('hl');
    }

    function setVox(url){
      hlWord(0);
      var path = '/'+url + '.ogg'; 
      audio.src = path.replace(/-/g,'_');
      audio.addEventListener("timeupdate", getStep, false);
      $(document).bind('keydown', 'c',function (evt){audio.play(); return false; });
      $(document).bind('keydown', 'v',function (evt){audio.pause(); return false; });
      $(document).bind('keydown', 'Space',function (evt){toggleSound(); return false; });

      $("#view_0").delegate("span.word", "click", function(event){
        $('#view_0 span.hl').removeClass('hl');
        $(this).addClass('hl');
        var vox = $(this).attr('vox')*1.0;
        audio.currentTime = vox;
      });
    }

    var getStep = function(){
      var $hl = $('#view_0 span.hl');
      var $words = $('#view_0 span.word');
      var index = $.inArray($hl[0], $words);
      var $next = $($words[index+1]);

      var vox = $next.attr('vox')*1.0;
      var ct = audio.currentTime;
      if (audio.currentTime > vox){
        $hl.removeClass('hl');
        $next.addClass('hl');
      }
    }

    function toggleSound(){
      if ($('#view_0 span.hl').attr('idx') == 0) {
        var vox = $('#view_0 span.hl').attr('vox')*1.0;
        audio.currentTime = vox; 
      }
      audio.paused ? audio.play() : audio.pause();
    }

  });


  $(function() {
    $('#container').hasClass('init') ? init() : app.run();
    //$('#view_0').focus();
  });

  function init(){
    var path = app.getLocation().replace(/^\//,'');
    var root = path.split('/').slice(0,2).join('/');
    lite.set('path', path);
    var info = {},
    data = {},
    pars = {},
    coms = {},
    nics = [],
    current = null;
    info[path] = {};

    $('.view').each(function(){
      var nic = $(this).attr('nic');
      var lang = $(this).attr('lang');
      if (lang == locale) current = nic; 
      nics.push(nic);  
      pars[nic] = $(this).find('p');
    });  
    
    _.each($('.page'), function(page, idx){
      if (idx > 1){$(page).remove();}      
    });

    lite.set('current', current);
    info[path].bare_nics = nics;

    //info[path].pars = pars;
    // здесь можно выяснить nics, а не bare_nics

    //lite.set('info', info); 

    if (!store.exists(root)){
      var q = '/by_book/' + encodeURIComponent(root);
      $.getJSON(q, function(json) {
        var data = json.rows[0].doc; 
        store.set(root, data);
        app.run();
      });
    } else app.run();
    //return false;   
  }

  return { // Public members
    closeAll: function(){
      $('.closed').hide('slow'); 
      $('#view_0').focus();
    },
    collapseTree: function(){
      $("#header_0").dynatree("getRoot").visit(function(node){
        node.expand(false);
      });
    },
    highlightLucene: function (query, row){
      // row returned from Lucene-couch, /templates/search_results.tpl
      var url = row.fields.url;
      var pos = row.fields.pos;
      var words = row.fields.text.split(' ');
      var index = $.inArray(query, words);
      var res = words.slice(index-5, index).join(' ') + ' <span class=maroon>' + query + '</span> ' + words.slice(index+1, index+6).join(' ');
      return '<li><span class="url maroon">' + url + '</span><span class="text"> #:<span class="pos">'+pos+'</span>: ...' + res + '...</span></li>';
    }
  }


})(jQuery);


function inspect(object){
    var result = '';
    for (var key in object){
	result += key + ': ' + object[key] + '\n';
    }
    return result;
}

