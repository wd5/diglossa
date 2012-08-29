 <div class="search-results">
    <div class="search-query">query: <span id="query"><%= query %></span>
      <ul class="search-results-link">
      <% for (var i in rows) { %>
        <%! Diglossa.highlightLucene(query, rows[i]) %> 
      <% } %>
      </ul>
  </div>
