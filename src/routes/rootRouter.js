const rootRouter = (app) =>
{
    app.route("/")
        .get((req, res) => res.send("welcome to the hamrah chat api"))
        .post((req, res) => res.send("welcome to the hamrah chat api"))
        .patch((req, res) => res.send("welcome to the hamrah chat api"))
        .delete((req, res) => res.send("welcome to the hamrah chat api"))
}

export default rootRouter