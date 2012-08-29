<div class='meander'></div>
<h1><%= book.author %></h1>
<h2><%= book.title %></h2>
<% _.each(book.trs, function(line, lang) { %>
<b><%= lang %></b>: <%= line %> <br>
<% }); %>

