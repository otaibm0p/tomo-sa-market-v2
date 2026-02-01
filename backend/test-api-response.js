const http = require('http');

http.get('http://localhost:3000/api/products', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Response type:', Array.isArray(json) ? 'Array' : 'Object');
      if (Array.isArray(json)) {
        console.log('Array length:', json.length);
        if (json.length > 0) {
          console.log('First product has is_featured:', json[0].is_featured);
        }
      } else if (json.products) {
        console.log('Products array length:', json.products.length);
        if (json.products.length > 0) {
          console.log('First product has is_featured:', json.products[0].is_featured);
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('Request error:', e.message);
});

