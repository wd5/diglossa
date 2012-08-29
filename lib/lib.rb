# -*- coding: utf-8 -*-
module Diglossa

  class Lib
    class << self

      # === seeds ===
      def get_authors
        JSON.parse( RestClient.get( "#{Diglossa::DBD}/_design/diglossa/_view/by_authors?include_docs=true"))['rows'].map{|r|r['doc']} rescue nil
      end

      def author_update nic = false
        # FIXME переделать на seeds_update
        #db_authors = JSON.parse( RestClient.get( "#{Diglossa::DBD}/_design/diglossa/_view/by_authors?include_docs=true"))['rows'].map{|r|r['doc']} rescue nil
        db_authors = get_authors
        json = File.new(File.join(Diglossa.seeds_dir, "authors.json"), 'r')
        parser = Yajl::Parser.new
        authors = parser.parse(json)
        authors.each do |author|
          next if nic && author['nic'] != nic
          #author['_deleted'] = true
          dba = db_authors.select{|auth|auth['nic'] == author['nic']}.first
          if dba
            author['_id'] = dba['_id']
            author['_rev'] = dba['_rev']
          end
        end
        json = RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => authors}.to_json, :content_type => :json, :accept => :json
      end

      def lang_update_ code = false
        db_langs = JSON.parse( RestClient.get( "#{Diglossa::DBD}/_design/diglossa/_view/by_lang?include_docs=true"))['rows'].map{|r|r['doc']} rescue nil
        json = File.new(File.join(Diglossa.seeds_dir, "languages.json"), 'r')
        parser = Yajl::Parser.new
        langs = parser.parse(json)
        langs.each do |lang|
          next if code && lang['code'] != code
          if (dba = db_langs.select{|auth|auth['code'] == lang['code']}.first)
            lang['_id'] = dba['_id']
            lang['_rev'] = dba['_rev']
          end
        end
        json = RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => langs}.to_json, :content_type => :json, :accept => :json
      end

      def get_seed seed, code # "trans", "book" or "author", "aquinas"
        json = RestClient.get "#{Diglossa::DBD}/_design/diglossa/_view/by_#{seed}?key=%22#{code}%22&include_docs=true", :content_type => :json, :accept => :json
        return JSON.parse(json)['rows'].map{|h|h["doc"]} rescue nil
      end

      def seed_push type, code = false # "trans" (i18n), "authors"
        db_seeds = JSON.parse( RestClient.get( "#{Diglossa::DBD}/_design/diglossa/_view/by_#{type}?include_docs=true"))['rows'].map{|r|r['doc']} rescue []
        json = File.new(File.join(Diglossa.seeds_dir, "#{type}.json"), 'r')
        parser = Yajl::Parser.new
        seeds = parser.parse(json)
        kode = type == "authors" ? "nic" : "code"
        seeds.each do |seed|
          next if code && seed['code'] != code
          dba = db_seeds.select{|auth|auth[kode] == seed[kode]}.first
          if dba
            seed['_id'] = dba['_id']
            seed['_rev'] = dba['_rev']
            #puts "==#{seed.inspect}"
          end
          #seed['_deleted'] = true
        end
        json = RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => seeds}.to_json, :content_type => :json, :accept => :json
      end


      # === data_tree ===

      def library_parse locale = 'en'
        require 'tree'
        db_langs = JSON.parse( RestClient.get( "#{Diglossa::DBD}/_design/diglossa/_view/by_lang?include_docs=true"))['rows'].map{|r|r['doc']} rescue nil
        db_auths = JSON.parse( RestClient.get( "#{Diglossa::DBD}/_design/diglossa/_view/by_authors?include_docs=true"))['rows'].map{|r|r['doc']} rescue nil
        tree = []
        files = File.join(Diglossa.base_dir, "../data/", "*/*/*")
        dirs = Dir.glob(files).map{|d|d.split('data/').last}.delete_if{|d|d.match(/Dicts|json|info|\.org/)}
        root = Tree::TreeNode.new("/")
        dirs.each do |dir|
          lang, auth, book = dir.split('/')
          root << Tree::TreeNode.new(lang, "lang Content") unless root[lang]
          root[lang] << Tree::TreeNode.new(auth, "auth Content") unless root[lang][auth]
          root[lang][auth] << Tree::TreeNode.new(book, "book Content")
        end
        #root.print_tree
        root.children.each do |lang|
          authors = []
          lang.children.each do |auth|
            books = []
            auth.children.each do |book|
              file_path =  "#{lang.name}/#{auth.name}/#{book.name}"
              if file_path.end_with? '.yml'
                path = file_path.sub(/\.yml/, '')
                tree_book = book_tree_get path rescue next
                next unless tree_book # lang exists, but book was not loaded
                title = tree_book[locale][0]['title']
                lang_name = tree_book['lang']
                books << {:title=>title, :url=>"#{path.to_url}"} # "/#{path.to_url}"
              end
            end
            dba = db_auths.select{|l|l["nic"] == auth.name.downcase}.first
            authors << {:title=> dba[locale], :isFolder=>true, :children=> books} unless books.empty?
          end
          dbl = db_langs.select{|l|l["dir"] == lang.name}.first
          tree <<{:title=>dbl[locale], :isFolder=>true, :pos => dbl["pos"], :children => authors} unless authors.empty?
        end
        tree.sort_by{|t|t[:pos]}
        return tree.sort_by{|t|t[:pos]}
      end

      def library_push
        doc_url = "#{Diglossa::DBD}/lib-tree"
        rev = JSON.parse( RestClient.get( doc_url))['_rev'] rescue nil
        tree = {}
        tree['_id'] = "lib-tree"
        tree['_rev'] = rev if rev
        I18n.available_locales.each do |locale|
          tree[locale] = library_parse locale.to_s
        end
        resp = RestClient.put doc_url, tree.to_json, :content_type => :json, :accept => :json
        #sitemap true
        return JSON.parse resp
      end

      def sitemap
        ru_sitemap = []
        en_sitemap = []
        sitemaps = []
        json = JSON.parse(RestClient.get "#{Diglossa::DBD}/_design/diglossa/_view/by_url", :content_type => :json, :accept => :json) rescue []
        urls = json['rows'].map{|row| row["key"]}.uniq
        I18n.available_locales.each do |locale|
          thousand = nil
          tmp = nil
          doc_url = nil
          arr = false
          urls.each_with_index do |url, index|
            thousand = (index/1000).round
            unless thousand == tmp
              doc_url = "#{Diglossa::DBD}/#{locale}_sitemap_#{thousand -1}"
              sitemaps << {locale:locale, url:doc_url, map:arr} if arr
              arr = []
              tmp = thousand
            else
              arr << "http://#{locale}.diglossa.org/#{url}"
            end
          end #rescue puts("ales, hang up")
          doc_url = "#{Diglossa::DBD}/#{locale}_sitemap_#{thousand}"
          sitemaps << {locale:locale, url:doc_url, map:arr}
        end # locales

        sitemaps.each do |map|
          rev = JSON.parse( RestClient.get(map[:url]))['_rev'] rescue nil
          doc = {}
          doc['_id'] = map[:url].split("/").last
          doc['_rev'] = rev if rev
          doc['sitemap'] = map[:map]
          resp = RestClient.put map[:url], doc.to_json, :content_type => :json, :accept => :json
        end
        return "ok" #sitemaps
      end

      # === BOOK ===

      def book_tree path
        # parse & return hash of book contents {:en=>.., :ru=>, etc}
        lang = path.split('/').first.downcase
        book, authors = parse_book path
        jstree = {:type=>"book", :url=>path.to_url, :authors=>authors, :lang=>lang, :rpp=>@rpp}
        I18n.available_locales.each do |locale|
          jsloc = tree locale.to_s, path, book, authors, nil, false
          jstree[locale] = [jsloc]
        end
        return jstree
      end

      def book_tree_get path
        json = RestClient.get "#{Diglossa::DBD}/_design/diglossa/_view/by_book?key=%22#{path.to_url}%22&include_docs=true", :content_type => :json, :accept => :json
        return JSON.parse(json)['rows'][0]["doc"] rescue nil
      end

      def book_delete path
        parts = path.split('/')
        return "non root" if parts.size > 3
        book, authors = parse_book path
        tree 'ru', path, book, authors, nil, 'delete'
      end

      def book_warns path
        parts = path.split('/')
        puts "size #{parts.size} #{path}"
        #return "non root" unless parts.size == 2
        book, authors = parse_book path
        tree 'ru', path, book, authors, nil, "warns"
        return @warnings
      end

      def parse_book path
        puts "PARSE_BOOKS path #{path}"
        @warnings = {:no_file => [], :size=>[], :com=>[]}
        @rpp = {}
        @authors = nil
        book = YAML.load_file File.new(File.join(Diglossa.lib_dir, path)+'.yml', 'r') #rescue "no book #{path}"
        author = path.split('/')[1].downcase
        authors = parse_authors(book['authors'], author)
        return [book['tree'], authors]
      end

      def parse_authors nics, author = false
        # FIXME: здесь можно сразу доставать из  кауча только нужных и запоминать их в @authors
        return if @authors
        puts "PARSE_AUTHORS"
        @authors = {}
        dba = get_authors
        nics.each do |nic|
          @authors[nic] = {}
          name = dba.find{|a| a['nic'] == nic}
          I18n.available_locales.each do |locale|
            @authors[nic][locale] = name[locale.to_s]
          end
          @authors[nic][:author] = true if nic == author
          @authors[nic][:lang] = name["lang"]
        end
        return @authors
      end

      def book_tree_push path, rpp = false
        jstree = book_tree path
        doc = book_tree_get path
        id = doc['_id'] rescue nil
        rev = doc['_rev'] rescue nil
        jstree["_id"] = id if id
        jstree["_rev"] = rev if rev
        jstree["rpp"] = rpp
        jstree["authors"] = @authors
        resp = RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => [jstree]}.to_json, :content_type => :json, :accept => :json
        JSON.parse resp
      end

      # main ====================
      def book_push path, push = "warns"
        # push texts, comments and book_tree
        parts = path.split('/')
        return "non root" if parts.size > 3

        book, authors = parse_book path
        tree 'ru', path, book, authors, nil, push
        if push == "push"
          get_authors
          book_tree_push path, @rpp
        end
        if %w(warns).include? push
          return @warnings
        end
        return nil
      end

      # FIXME , authors убрать ==== а если ни hash, ни child нет?
      def tree locale, path, hash, authors, jstree, push=false
        puts "TREE push=#{push}"
        author_nic = path.split("/")[1].downcase
        jstree = {:title=> hash[locale], :isFolder=>true, :expand=> true, :children=>[]} unless jstree
        hash['authors'] ||= @authors.keys
        authors = {}
        nics = {}
        vox = false
        hash['authors'].each do |nic|
          authors[nic] = @authors[nic]
          nics[nic] = {:name=>@authors[nic][locale.to_sym], :lang=>@authors[nic][:lang]} unless nic == author_nic
        end
        author = @authors[author_nic]
        jstree[:author] = {:nic=>author_nic, :name=>author[locale.to_sym], :lang=>author[:lang]}
        hash["children"].each_with_index do |child, index|
          if child['authors']
            authors = {}
            nics = {}
            child['authors'].each do |nic|
              authors[nic] = @authors[nic]
              nics[nic] = {:name=>@authors[nic][locale.to_sym], :lang=>@authors[nic][:lang]} unless nic == author_nic
            end
          end
          child_path = "#{path}/#{child['title'].sub(".","").to_underscore}"
          if child['children']
            jstree[:children][index] = {:title=> child[locale], :isFolder=>true, :expand=> true, :children=>[]}
            tree locale, child_path, child, authors, jstree[:children][index], push
          else
            children = children_files child_path
            if children
              jstree[:children][index] = {:title=> child[locale], :isFolder=>true, :expand=> true, :children=>[]}
              tree locale, child_path, child, authors, jstree[:children][index], push
            else
              vox = child['vox'] || false
              docs_from_file child_path, authors, vox, push if %w(push warns del).include? push
              jstree[:children][index] =  {:title=>child[locale], :url => "#{child_path.to_url}", :nics=>nics}
              jstree[:children][index][:addClass] = "vox" if child['vox']
            end
          end
        end if hash["children"]
        children = children_files path
        if children #&& !hash["children"]
          name = children.first.split("_").first
          translated = Diglossa::Lib.get_seed('trans', name.downcase).first[locale]
          #children = hash['children_add'] + children if hash['children_add']
          children.each_with_index do |child, index|
            next if jstree[:children][index]
            child_path = "#{path}/#{child}"
            docs_from_file child_path, authors, vox, push if %w(push warns del).include? push
            jstree[:children][index] = {:title=>child.sub(name,translated).sub("_"," "), :url => "#{child_path.to_url}", :nics=>nics}
            # tree locale, child_path, child, authors, jstree[:children][index], push
          end
        end
        return jstree
      end

      def voxmap_for_author path, nic
        i = 0
        vox = {}
        par = false
        fn = File.expand_path(File.join(Diglossa.lib_dir, "#{path}.#{nic}.vox"))
        puts "FN #{fn}"
        File.foreach(fn) do |line|
          next if line.strip!.empty?
          if line.split.size == 1
            par = line.to_i
            vox[par] = {}
            i = 0
          else
            vox[par][i] = line.split[1]
            i += 1
          end
        end rescue return false
        return vox
      end

      def docs_from_file path, authors, vox, push
        sizes = []
        docs_to_send = []
        authors.each do |nic, author|
          # {"plato"=>{:ru=>"Платон", :en=>"Plato", :author=>true, :lang=>"gr"}, ...
          puts "--> #{nic}: #{path.to_url}"
          voxmap = false
          voxmap = voxmap_for_author path, nic if author[:author] && vox
          docs = doc_texts(path, nic, author)
          sizes << docs.size
          doc_coms = doc_coms(path, nic, author, docs)
          doc_html = doc_design(path, nic, author, doc_coms, voxmap)
          docs_to_send += doc_html
        end

        if push == "push"
          docs_update docs_to_send, path
        elsif push == "del"
          docs_delete path
        else
          @warnings[:size] << "#{path} == #{sizes}" unless sizes.uniq.size == 1
        end
        return nil
      end

      def doc_texts path, nic, author
        fn = File.expand_path(File.join(Diglossa.lib_dir, "#{path}.#{nic}"))
        docs = []
        #next if line.empty?
        flag = true
        File.foreach(fn) do |line|
          line.strip! #.gsub!(/\s+/, " ").gsub!("*", " *").gsub!(" /", "/")
          if line.empty?
            flag = true
          else
            if flag
              docs << {:type=> 'text', :url=>path.to_url, :nic=>nic, :lang=>author[:lang], :text=>line}
              flag = false
            else
              docs.last[:text] = docs.last[:text] + " / #{line}"
            end
          end
        end rescue @warnings[:no_file] |= ["#{path}.#{nic}"]

        # some stupid heuristique for rpp
        vol = docs.inject(0){|vol,doc| vol + doc[:text].size}
        rows_per_page = vol == 0 ? 25 : (10000*(docs.size)/vol).round
        @rpp[path.to_url] = rows_per_page.to_s

        return docs.each_with_index.map{|doc, index| doc[:pos] = index; doc}
      end

      def doc_coms path, nic, author, docs
        coms = []
        fnc = File.expand_path(File.join(Diglossa.lib_dir, "#{path}.#{nic}-com"))
        File.foreach(fnc) do |line|
          next if line.strip!.empty? || line.match(/\*/).nil?
          com_arr = line.to_comment
          if com_arr.class == Array
            anchor, comment = com_arr
          else
            @warnings[:com] |= ["#{fnc.split("/").last}:  |#{com_arr}|"]
          end
          next unless anchor
          re_anchor = Regexp.new anchor.sub("*","\\*"), true
          paragraph = docs.detect{|doc| doc[:text].match(re_anchor)}
          unless paragraph.nil?
            (paragraph[:coms] ||= []) << {:anchor=> anchor, :com=>comment, :author=>author} # FIXME may be only nic?
          else
            @warnings[:com] |= ["#{path}.#{nic}:  |#{anchor}|"]
          end
        end rescue nil #@warnings[:no_com_file] |= ["#{fnc}"]
        return docs
      end

      def doc_design path, nic, author, docs, voxmap = false
        docs.each_with_index do |doc, index|
          if author[:author] && (author[:lang] == "latin") || voxmap
            sentences = doc[:text].split(/((?<=[a-z0-9)][.?!])|(?<=[a-z0-9][.?!]"))\s+(?="?[A-Z])/) - [""]
            html = sentences.each_with_index.map do |sent, idx_0|
              words = sent.split(" ").each_with_index.map do |word, idx_1|
                # пока что у меня в файлах voxmap все абзацы - по одному предложению. В дайнейшем разбивать по предложениям
                #word == "/" ? "<br>": "<span class='word'>#{word}</span>"
                word == "/" ? "<br>" : voxmap ? "<span class='word' vox=#{voxmap[index][idx_1]}>#{word}</span>" : "<span class='word'>#{word}</span>"
              end.join(" ")
              "<span class=\"sentence\">#{words}</span>"
            end.join(". ")
          else
            html = doc[:text]
            #html = html.gsub("%s:","<span class=\"search\">").gsub(":s%","</span>")
            #html = html.gsub("%h:","<p class=\"hidden\">").gsub(":h%","</p>")
            html = html.gsub(" /","<br>")
          end

          coms = doc[:coms] ? "coms=\"#{doc[:coms].size}\"" : nil
          index_str = "pos=\"#{index}\""
          doc[:par] = case index
            when 0
              "<p class=\"ash3 new text\" #{index_str} #{coms}>#{html}</p>"
            when 1
              "<p class=\"ash4 new text\"  #{index_str} #{coms}>#{html}</p>"
            else
              "<p class=\"new text\" #{index_str} #{coms}>#{html}</p>"
            end
        end
        return docs
      end

      # отдельно сделать design_word и design_text? Поскольку нет выделения слов?
      def design word
        sm = '<span class="maroon">'
        s = '</span>'
        word = word.gsub("*", " *").gsub(/((\*(\d)+)|(^(\d)+))/, sm +'\1'+s).gsub(/ \/ /, '<br>')
        if (word.match(/^(\w|[а-яА-Я])(\.|\)) .+/) && word.split.size < 10) || # безумие про 10 ???
            word.match(/^§/ ||
                       word.match(/((\*(\d)+)|(^\(\d\)+))/) ||
                       word.match(/_.+/)
                       )
          word = sm + word + s
        end
        return word
      end

      def docs_update docs, path
        docs_to_send = []
        db_docs =  docs_get path
        max = [docs.size, db_docs.size].max
        max.times.each do |index|
          if db_docs[index] && docs[index]
            docs[index]["_id"] = db_docs[index]["_id"]
            docs[index]["_rev"] = db_docs[index]["_rev"]
            docs_to_send.push docs[index]
          elsif db_docs[index]
            db_docs[index]["_deleted"] = true
            docs_to_send.push db_docs[index]
          else
            docs_to_send.push docs[index]
          end
        end
        puts "===>#{path} docs_to_send #{docs_to_send.size}"
        RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => docs_to_send}.to_json, :content_type => :json, :accept => :json
      end

      def docs_delete path
        docs =  docs_get path
        docs.each do |doc|
          doc["_deleted"] = true
        end
        puts "===>#{path} docs_deleted #{docs.size}"
        RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => docs}.to_json, :content_type => :json, :accept => :json
      end

      def docs_get path
        db_docs =  JSON.parse(RestClient.get("#{Diglossa::DBD}/_design/diglossa/_view/by_url?key=%22#{path.to_url}%22&include_docs=true"))['rows'].map{|r|r['doc']} || []
      end

      def docs_get_root path
        parts = path.split('/')
        root = [parts[0], parts[1], parts[2]].join("/").to_url
        puts "==root== #{root}"
        db_docs =  JSON.parse(RestClient.get("#{Diglossa::DBD}/_design/diglossa/_view/by_url_root?key=%22#{root}%22&include_docs=true"))['rows'].map{|r|r['doc']} || []
      end

      # def esearch path
      #   db_docs =  JSON.parse(RestClient.get("#{Diglossa::DBD}/_design/diglossa/_view/by_es_url_text?key=%22#{path.to_url}%22")) #['rows']} || []
      # end

      def children_files path
        files = []
        Dir[File.expand_path(File.join(Diglossa.lib_dir, path, '*.*'))].each do |file|
          files << file if FileTest.file?(file) && file.match(/\w+_(\d)+\.\w+[^-]$/)
        end rescue nil
        return false if files.empty?
        paths = files.map{|f|File.basename(f).split('.').first}.uniq.sort{ |a,b|String.natcmp(a,b)} # natural sorting
        names = paths.map{|n|n.split('_').first}.uniq
        unless names.size == 1
          puts "name shoud be uniq: #{names.size}"
          return false
        end
        #return [names.first, paths] # для OLD parse_book_ -> transform
        return paths
      end

      ### OLD

#      def doc_update docs, path
#      RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => docs}.to_json, :content_type => :json, :accept => :json
#      end

      # def doc_from_file  path, nic, author
      #   vox = {}
      #   if author[:author]
      #     i = 0
      #     par = false
      #     fn = File.expand_path(File.join(Diglossa.lib_dir, "#{path}.#{nic}.vox"))
      #     File.foreach(fn) do |line|
      #       next if line.strip!.empty?
      #       if line.split.size == 1
      #         par = line.to_i
      #         vox[par] = {}
      #         i = 0
      #       else
      #         vox[par][i] = line.split[1]
      #         i += 1
      #       end
      #     end rescue nil
      #   end

      #   # pars
      #   fn = File.expand_path(File.join(Diglossa.lib_dir, "#{path}.#{nic}"))
      #   pars = []
      #   i = 0
      #   File.foreach(fn) do |line|
      #     next if line.strip!.empty?
      #     ws = []
      #     idx = 0
      #     line.split.map do |w|
      #       if w == "/"
      #         ws.push("<br>")
      #       else
      #         if vox.empty?
      #           ws.push("<span class='word' idx='#{idx}'>#{w}</span>")
      #         else
      #           voc = vox[i] ? vox[i][idx] : ""
      #           ws.push("<span class='word' idx='#{idx}' vox='#{voc}'>#{w}</span>")
      #         end
      #         idx += 1
      #       end
      #     end
      #     dotted = ws.join(" ").gsub(".</span>", "</span>.")
      #     dotted = dotted.split(".").each_with_index.map{|sent, index| "<span class='sentence' idx='#{index}'>#{sent}</span>"}.join(". ")
      #     dotted = dotted.gsub("</span></span>.", ".</span></span>")
      #     pars << {:type=> 'text', :url=>path.to_url, :nic=>nic, :pos=> i, :par=>dotted, :text=>line}
      #     i += 1
      #   end rescue @warnings[:no_file] |= ["#{path}.#{nic}"]

      #   coms = {}
      #   fnc = "#{fn}-com"
      #   fnc = File.expand_path(File.join(Diglossa.lib_dir, "#{path}.#{nic}-com"))
      #   File.foreach(fnc) do |line|
      #     next if line.strip!.empty? || line.match(/\*/).nil?
      #     com_arr = line.to_comment
      #     if com_arr.class == Array
      #       anchor, comment = com_arr
      #     else
      #       @warnings[:com] |= ["#{fnc.split("/").last}:  |#{com_arr}|"]
      #     end
      #     next unless anchor
      #     re_anchor = Regexp.new anchor.sub("*","\\*"), true
      #     paragraph = pars.detect{|p| p[:par].match(re_anchor)}
      #     unless paragraph.nil?
      #       coms[paragraph[:pos]] ||= []
      #       coms[paragraph[:pos]] << {:anchor=> anchor, :com=>comment, :author=>author}
      #       paragraph[:coms] = coms.size
      #     else
      #       @warnings[:com] |= ["#{path}.#{nic}:  |#{anchor}|"]
      #     end
      #   end rescue nil #@warnings[:no_com_file] |= ["#{fnc}"]

      #   pars.map!{|p| {:type=> 'text', :url=>path.to_url, :nic=>nic, :pos=> p[:pos], :lang=>author[:lang], :par=>design(p[:pos], p[:par], p[:coms]), :coms=>coms[p[:pos]]}}

      #   vol = pars.inject(0){|vol,s| vol + s[:par].size}/10 # approx 10 - case of <span ...>
      #   rows_per_page = vol == 0 ? 25 : (10000*(pars.size)/vol).round
      #   @rpp[path.to_url] = rows_per_page
      #   return pars
      # end

      # def doc_delete_ path
      #   dels = []
      #   db_docs =  JSON.parse(RestClient.get("#{Diglossa::DBD}/_design/diglossa/_view/by_url?key=%22#{path.to_url}%22&include_docs=true"))['rows'].map{|r|r['doc']}
      #   db_docs.each do |doc|
      #     doc["_deleted"] = true
      #     dels.push doc
      #   end
      #   RestClient.post "#{Diglossa::DBD}/_bulk_docs", {"docs" => dels}.to_json, :content_type => :json, :accept => :json
      # end

      # def design_ index, str, coms
      #   sm = '<span class="maroon">'
      #   s = '</span>'
      #   str = str.gsub("*", " *").gsub(/((\*(\d)+)|(^(\d)+))/, sm +'\1'+s).gsub(/ \/ /, '<br>')
      #   #str = str.gsub(/((\*(\d)+)|(^(\d)+))/, sm +'\1'+s)
      #   #str = str.gsub(/ \/ /, '<br>')
      #   if (str.match(/^(\w|[а-яА-Я])(\.|\)) .+/) && str.split.size < 10) || str.match(/^§/)
      #     str = sm + str + s
      #   end
      #   #str = str.split.map{|w|"<span class='word'>#{w}</span>"}.join(" ")
      #   case index
      #   when 0
      #     "<p class=\"ash3 new text\" pos=\"#{index}\" coms=\"#{coms}\">#{str}</p>"
      #   when 1
      #     "<p class=\"ash4 new text\"  pos=\"#{index}\" coms=\"#{coms}\">#{str}</p>"
      #   else
      #     "<p class=\"new text\" pos=\"#{index}\" coms=\"#{coms}\">#{str}</p>"
      #   end
      # end

    end
  end
end

