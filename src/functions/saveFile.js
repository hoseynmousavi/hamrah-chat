const saveFile = ({file, folder}) =>
{
    return new Promise((resolve, reject) =>
    {
        if (file && folder && typeof file === "object")
        {
            const fileName = new Date().toISOString() + file.name
            file.mv(`media/${folder}/${fileName}`, err =>
            {
                if (err) reject(err)
                else resolve({path: `/media/${folder}/${fileName}`})
            })
        }
        else resolve({data: file})
    })
}

export default saveFile