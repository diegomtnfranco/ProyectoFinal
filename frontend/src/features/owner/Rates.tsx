import RateForm from "./Rates/RateForm"
import RateList from "./Rates/RateList"


const RatesPage = () => {
  return (
    <div className="w-full flex">
        <div className="w-1/3">
            <RateForm />
        </div>
        
            <RateList />

        

    </div>
  )
}

export default RatesPage