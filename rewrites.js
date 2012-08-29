
/**
 * this file contains the json representation for rewrite rules    
**/
[
  { // rewriting / to index.html-autoview-mode
    "from":"/",
    "to":"index.html",
    "method":"GET",
    "query":{}
  },
  {
    "from":"section/*",
    "to":"index.html"
  },
  {
    "from":"ru_sitemap_0.xml", // FIXME
    "to":"_show/sitemap/ru_sitemap_0"
  },
  {
    "from":"ru_sitemap_1.xml",
    "to":"_show/sitemap/ru_sitemap_1"
  },
  {
    "from":"en_sitemap_0.xml",
    "to":"_show/sitemap/en_sitemap_0"
  },
  {
    "from":"en_sitemap_1.xml",
    "to":"_show/sitemap/en_sitemap_1"
  },
  {
    "from":"/robots.txt",
    "to":"robots.txt"
    //"to":"/diglossa/_design/diglossa/robots.txt"
  },
  {
    "from":"templates/*",
    "to":"templates/*"
  },
  { 
    "from":"/lib-tree",
    "to":"../../lib-tree",
    "method":"GET",
    "query":{}
  },
  { 
    "from":"/by_book/*",
    "to":"_view/by_book",
    "method":"GET",
    "query":{"include_docs": "true"},
    "query":{"key":"*", "include_docs": "true"}
  },
  { 
    "from":"/by_lang",
    "to":"_view/by_lang",
    "method":"GET",
    "query":{"include_docs": "true"}
  },
  { 
    "from":"/by_path",
    "to":"_view/by_path",
    "method":"GET",
    "query":{}
    //"query":{"include_docs": "true"}
  },
  { 
    "from":"/by_forms",
    //"to":"../../../latin-forms/_design/latin-forms/_view/by_form",
    "to":"../../../latin-forms/_design/latin-forms/_list/sentence/by_all_forms",
    //"to":"../../../latin-forms",
    //"method":"GET",
    "method":"POST",
    //"ContentType":"json",
    //"query":{}
    "query":{"include_docs": "true"}
  },
  { 
    "from":"/by_dict",
    "to":"../../../latin/_design/latin/_view/by_dict",
    //"method":"GET",
    "query":{"include_docs": "true"}
  },
  { 
    "from":"/counter",
    "to":"../../../counters",
    "method":"POST",
    "ContentType": "json",
    "query":{}
  },
  { 
    "from":"/lucene",
    "to":"../../../counters",
    "method":"POST",
    "ContentType": "json",
    "query":{}
  },
  {
    "from":"css/*",
    "to":"css/*"
  },
  {
    "from":"js/*",
    "to":"js/*"
  },
  {
    "from":"diglossa/_fti/*",
    "to":"../../_fti/*"
  },
  {
    "from":"diglossa/*",
    "to":"diglossa/*"
  },
  { 
    "from":"/by_url",
    "to":"_view/by_url",
    "method":"GET",
    "query":{}
    //"query":{"include_docs": "true"}
  },
  { 
    "from":"/by_page",
    "to":"_view/by_page/",
    "method":"GET",
    "query":{"include_docs": "true"}
  },
  {
    "from":":a/:b",
    "to":"index.html",
    //"to":"_list/index/by_book",
    "method":"GET",
    "query":{}
    //"query":{"key":[":a", ":b"], "include_docs": "true"}
  },
  {
    "from":":a/:b/:c",
    "to":"_list/index/by_seo",
    "method":"GET",
    //"method":"POST",
    //"query":{"key":"\":a\""}
    //"query":{"key":"\":a\""}
    //"query":{"key":"\"Abelard/Historia-Calamitatum/Caput-2\"", "include_docs": "true"}
    //"query":{"key":"\"Abelard/Historia-Calamitatum/Caput-2\""}
    "query":{"key":[":a", ":b",":c"], "include_docs": "true"}
    //"query":{"key":"\"*\"", "include_docs": "true"} 
    //"query":{"startkey": ["\"*\""], "endkey": ["\"*\"", {}], "include_docs": "true"} 
    //"query":{"include_docs": "true"} // <==
    //"query": {}
  },
  {
    "from":":a/:b/:c/:d",
    "to":"_list/index/by_seo4",
    "method":"GET",
    "query":{"key":[":a", ":b", ":c", ":d"], "include_docs": "true"}
  },
  {
    "from":":a",
    "to":"index.html",
    "method":"GET",
    "query":{}
  },
  { // keeping relative urls sane
    "from":"/*",
    //"to":"/*"
    "to":"index_.html"
  }
]
