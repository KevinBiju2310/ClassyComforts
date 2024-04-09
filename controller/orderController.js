exports.orderGet = async(req,res) =>{
    try{
        res.render('orders');
    } catch(error){
        console.log("Error Happend : ",error);
    }
}


exports.orderPlaced = (req,res) =>{
    try{
        res.render('orderSuccessfull')
    }catch(error){
        
    }
}