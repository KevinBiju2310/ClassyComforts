

exports.cartGet = async(req,res)=>{
    try{
        res.render('cart');
    }catch(error){
        console.log("Error Occured : ",error);
    }
}