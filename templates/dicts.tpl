<div class="dicts" id="dicts">

  <div class="dict">dict: <b><%= dict.dict %></b>: 

    <% if (dict.pos == 'noun') { %>
       sggen: <%= dict.sggen %>, gend: <%= dict.gend %>, decl: <%= dict.descr %> 
    <% } else if (dict.pos == 'verb') { %>
       inf: <%= dict.inf %>, perf: <%= dict.perf %>, supine: <%= dict.supine %> 
    <% } else if (dict.pos == 'adj') { %>
       raw flex: <%= dict.rawflex %>, decl: <%= dict.descr %> 
    <% } %>

    <% if (dict.ref) { %>
       <br><b>ref</b>: <span id="dict-ref"><%= dict.ref %></span> 
    <% } %>

    
</div>

    <% if (typeof(ru_tail) != 'undefined') { %>
        <% var dict_id = dict.dict + '_' + dict.pos + '_ru' ; %>
         <div class="dict"><b>ru</b>: <a href="#" onclick="$('#<%= dict_id %>').toggle(); return false;"> <%= ru_first %>...</div>
         <div class="dict" id="<%= dict_id %>" style="display:none"><%! ru_tail %></a></div>
    <% } else if (typeof(ru_first) != 'undefined') { %>
          <div class="dict"><b>ru</b>: <%= ru_first %></div>
    <% } %>

    <% if (typeof(en_tail) != 'undefined') { %>
        <% var dict_id = dict.dict + '_' + dict.pos + '_en' ; %>
         <div class="dict"><b>en</b>: <a href="#" onclick="$('#<%= dict_id %>').toggle();; return false;"> <%= en_first %>...</div>
         <div class="dict" id="<%= dict_id %>" style="display:none"><%! en_tail %></a></div>
    <% } else if (typeof(en_first) != 'undefined') { %>
          <div class="dict"><b>en</b>: <%= en_first %></div>
    <% } %>

</div>