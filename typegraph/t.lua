wrk.method = "POST"
wrk.body = '{"operationName":null,"variables":{},"query":"{add(a: 2, b: 4)currentToken indexPlayground(a: 6)}"}'
wrk.headers["Content-Type"] = "application/json"
wrk.headers["token"] = "test2"

