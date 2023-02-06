function handler(event) {
  var request = event.request;
  var querystring = request.querystring;
  var host = request.headers["host"].value;

  if (!querystring["subdomain"]) {
    querystring["subdomain"] = { value: host.split(".")[0] };
  }

  return request;
}
