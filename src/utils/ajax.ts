interface Request {
  url: string
	type?: 'GET' | 'POST'
  contentType?: string
  payload?: Object
}

export default (req: Request) => {
	return new Promise((resolve, reject) => {
		const request = new XMLHttpRequest();
		let payload;
    if (req.type == 'GET') {
      payload = Object.keys(req.payload).map(
        function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(req.payload[k]) }
      ).join('&');
    }
    else {
      payload = JSON.stringify(req.payload);
		}
		request.open(req.type || 'GET', req.url, true);
		request.onload = () => {
			 if (request.status >= 200 && request.status < 400) {
					resolve(request.responseText);
			 }
			 else {
				 reject('server error');
			 }
		};
		request.onerror = (e) => {
			reject(e);
		};
		if (req.contentType) {
			request.setRequestHeader('Content-Type', req.contentType);
		}
		request.send(payload);
	});
};
