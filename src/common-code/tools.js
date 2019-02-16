const Tools = {
	getEmpireFacetItem: (empire, key) => {
		for (let facet_key in empire) {
            const facet = empire[facet_key]
            
            for (let facet_item_key in facet) {
            	if (facet_item_key === key) return facet[facet_item_key]
            }
        }
	}
}
module.exports = Tools
