

exports.orderGet = async(req,res) =>{
    try{
        res.render('orders');
    } catch(error){
        console.log("Error Happend : ",error);
    }
}