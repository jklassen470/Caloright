import { Camera, Check, Plus, Search, Upload, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { BarcodeDetector } from 'barcode-detector/ponyfill'
import { lookupFoodByBarcode } from '../services/barcodeLookupService'
import { searchFoods } from '../services/foodSearchService'

const RECENT_SEARCHES = ['Apple', 'Egg', 'Chicken Breast', 'Brown Rice']

function emptyFoodForm() {
  return {
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
  }
}

function buildFoodEntry(formData) {
  return {
    name: formData.name.trim(),
    calories: Number(formData.calories) || 0,
    protein: Number(formData.protein) || 0,
    carbs: Number(formData.carbs) || 0,
    fat: Number(formData.fat) || 0,
  }
}

function buildRecipeFoodEntry(formData, ingredients) {
  return {
    ...buildFoodEntry(formData),
    source: 'recipe',
    ingredientFoodIds: ingredients
      .map((ingredient) => ingredient.foodId)
      .filter(Boolean),
    ingredients: ingredients.map((ingredient) => ({
      foodId: ingredient.foodId,
      name: ingredient.name,
      portion: ingredient.portion,
      calories: ingredient.calories,
      protein: ingredient.protein,
      carbs: ingredient.carbs,
      fat: ingredient.fat,
    })),
  }
}

// Keep the recipe math in one place so the add and remove flows stay easy to follow.
function calculateRecipeTotals(ingredients) {
  const totals = ingredients.reduce(
    (summary, ingredient) => ({
      calories: summary.calories + ingredient.calories,
      protein: summary.protein + ingredient.protein,
      carbs: summary.carbs + ingredient.carbs,
      fat: summary.fat + ingredient.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return {
    calories: totals.calories ? String(totals.calories) : '',
    protein: totals.protein ? totals.protein.toFixed(1) : '',
    carbs: totals.carbs ? totals.carbs.toFixed(1) : '',
    fat: totals.fat ? totals.fat.toFixed(1) : '',
  }
}

function buildDisplayName(foodResult) {
  return [foodResult.brandName, foodResult.name].filter(Boolean).join(' ').trim() || foodResult.name
}

// Scaling a food's nutrition values by a multiplier and rounding to 1 decimal place.
function scaleNutrition(food, scale) {
  return {
    calories: Math.round(food.calories * scale * 10) / 10,
    protein: Math.round(food.protein * scale * 10) / 10,
    carbs: Math.round(food.carbs * scale * 10) / 10,
    fat: Math.round(food.fat * scale * 10) / 10,
  }
}

function AddFoodForm({ onAddFood, onCancel }) {
  const [activeTab, setActiveTab] = useState('quick-add')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedFoodId, setSelectedFoodId] = useState(null)
  const [displayCount, setDisplayCount] = useState(3)
  // Tracking whether the user wants branded foods included in quick add search results.
  const [includeBranded, setIncludeBranded] = useState(false)
  // Amount selector state for quick add — tracks whether the user is entering grams or servings.
  const [quickAmountMode, setQuickAmountMode] = useState('grams')
  const [quickAmountValue, setQuickAmountValue] = useState('100')
  const [recipeName, setRecipeName] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [manualSearchResults, setManualSearchResults] = useState([])
  const [manualDisplayCount, setManualDisplayCount] = useState(3)
  const [manualForm, setManualForm] = useState(emptyFoodForm())
  // Pending ingredient waiting for an amount to be entered before it gets added to the recipe.
  const [pendingIngredient, setPendingIngredient] = useState(null)
  const [ingredientAmountMode, setIngredientAmountMode] = useState('grams')
  const [ingredientAmountValue, setIngredientAmountValue] = useState('100')
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [photoForm, setPhotoForm] = useState(emptyFoodForm())
  const [photoFoodId, setPhotoFoodId] = useState('')
  const [detectedBarcode, setDetectedBarcode] = useState('')
  const [photoStatusMessage, setPhotoStatusMessage] = useState('')
  const [photoErrorMessage, setPhotoErrorMessage] = useState('')
  // Serving size string from the API (e.g. "240 mL", "12g") shown next to the servings input.
  const [barcodeServingSize, setBarcodeServingSize] = useState('')
  // Numeric serving size from the API (e.g. 240 for milk) used as the default weight input and for scaling.
  const [barcodeServingAmount, setBarcodeServingAmount] = useState(100)
  // Whether the user is logging by servings, grams, or mL.
  const [barcodeMode, setBarcodeMode] = useState('servings')
  // The amount the user entered — number of servings, grams, or mL depending on the mode.
  const [barcodeAmount, setBarcodeAmount] = useState('1')
  // The unit returned by the API — determines whether to show the grams or mL tab.
  const [barcodeServingUnit, setBarcodeServingUnit] = useState('g')
  // Per-serving and per-100g nutrition saved from the API so the form can swap values when the mode changes.
  const [barcodePerServing, setBarcodePerServing] = useState(null)
  const [barcodePerHundred, setBarcodePerHundred] = useState(null)
  const ingredientIdCounter = useRef(0)

  const visibleResults = useMemo(
    () => searchResults.slice(0, displayCount),
    [searchResults, displayCount],
  )

  const visibleManualResults = useMemo(
    () => manualSearchResults.slice(0, manualDisplayCount),
    [manualSearchResults, manualDisplayCount],
  )

  const selectedFood = useMemo(
    () => searchResults.find((food) => food.id === selectedFoodId) ?? null,
    [searchResults, selectedFoodId],
  )

  const hasRecipeIngredients = recipeIngredients.length > 0

  // Update one field in a form object.
  const updateFormField = (setForm, field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const resetManualRecipeBuilder = () => {
    setRecipeName('')
    setRecipeIngredients([])
    setManualSearchQuery('')
    setManualSearchResults([])
    setManualDisplayCount(3)
    setManualForm(emptyFoodForm())
  }

  // Search the small local food list for the quick-add tab.
  const handleSearch = async (query = searchQuery) => {
    const nextQuery = query
    const cleanedQuery = nextQuery.trim()

    setSearchQuery(nextQuery)
    setQuickAmountMode('servings')
    setQuickAmountValue('1')

    if (!cleanedQuery) {
      setSearchResults([])
      setSelectedFoodId(null)
      setDisplayCount(3)
      return
    }

    try {
      // Passing the branded flag so the search includes or excludes branded USDA foods.
      const results = await searchFoods(cleanedQuery, includeBranded)
      setSearchResults(results)
      setSelectedFoodId(null)
      setDisplayCount(3)
    } catch (error) {
      console.error('[AddFoodForm] quick add search failed:', error)
      setSearchResults([])
      setSelectedFoodId(null)
      setDisplayCount(3)
    }
  }

  // Search the same food list again, but this time for recipe ingredients.
  const handleManualSearch = async (query = manualSearchQuery) => {
    const nextQuery = query
    const cleanedQuery = nextQuery.trim()

    setManualSearchQuery(nextQuery)

    if (!cleanedQuery) {
      setManualSearchResults([])
      setManualDisplayCount(3)
      return
    }

    try {
      const results = await searchFoods(cleanedQuery)
      setManualSearchResults(results)
      setManualDisplayCount(3)
    } catch (error) {
      console.error('[AddFoodForm] manual ingredient search failed:', error)
      setManualSearchResults([])
      setManualDisplayCount(3)
    }
  }

  const handleRecipeNameChange = (value) => {
    setRecipeName(value)
    setManualForm((current) => ({
      ...current,
      name: value,
    }))
  }

  // Every ingredient updates the running nutrition totals shown in the form inputs.
  const handleAddIngredient = (food) => {
    ingredientIdCounter.current += 1

    const ingredient = {
      ...food,
      id: `${food.id}-${ingredientIdCounter.current}`,
    }

    const nextIngredients = [...recipeIngredients, ingredient]
    const nextTotals = calculateRecipeTotals(nextIngredients)

    setRecipeIngredients(nextIngredients)
    setManualForm((current) => ({
      ...current,
      name: recipeName,
      ...nextTotals,
    }))
    setManualSearchQuery('')
    setManualSearchResults([])
    setManualDisplayCount(3)
  }

  // Showing the amount picker for a selected ingredient before adding it to the recipe.
  const handleSelectIngredient = (food) => {
    setPendingIngredient(food)
    setIngredientAmountMode('servings')
    setIngredientAmountValue('1')
  }

  // Scaling the pending ingredient by the chosen amount and adding it to the recipe.
  const handleConfirmIngredient = () => {
    if (!pendingIngredient) return

    // Scaling by servings using the actual serving size, or directly by grams/mL from the 100g base.
    const ingredientServingAmount = pendingIngredient.servingAmount || 100
    const scale = ingredientAmountMode === 'servings'
      ? Number(ingredientAmountValue) * (ingredientServingAmount / 100)
      : Number(ingredientAmountValue) / 100

    handleAddIngredient({
      ...pendingIngredient,
      ...scaleNutrition(pendingIngredient, scale),
    })

    setPendingIngredient(null)
    setIngredientAmountMode('grams')
    setIngredientAmountValue('100')
  }

  const handleRemoveIngredient = (ingredientId) => {
    const nextIngredients = recipeIngredients.filter((ingredient) => ingredient.id !== ingredientId)
    const nextTotals = calculateRecipeTotals(nextIngredients)

    setRecipeIngredients(nextIngredients)
    setManualForm((current) => ({
      ...current,
      name: recipeName,
      ...nextTotals,
    }))
  }

  // Scaling the selected quick-add food by the chosen amount and adding it to the log.
  const handleQuickAddFood = () => {
    if (!selectedFood) {
      return
    }

    // Scaling by servings using the actual serving size, or directly by grams/mL from the 100g base.
    const servingAmount = selectedFood.servingAmount || 100
    const scale = quickAmountMode === 'servings'
      ? Number(quickAmountValue) * (servingAmount / 100)
      : Number(quickAmountValue) / 100

    onAddFood({
      source: 'quick-add',
      foodId: selectedFood.foodId,
      name: selectedFood.name,
      ...scaleNutrition(selectedFood, scale),
    })
  }

  // The manual tab can behave like a recipe builder or a traditional entry form.
  const handleManualSubmit = (event) => {
    event.preventDefault()

    if (!manualForm.name.trim()) {
      return
    }

    if (hasRecipeIngredients && !manualForm.calories) {
      return
    }

    if (!hasRecipeIngredients && !manualForm.calories) {
      return
    }

    if (hasRecipeIngredients) {
      onAddFood(buildRecipeFoodEntry(manualForm, recipeIngredients))
    } else {
      onAddFood({
        ...buildFoodEntry(manualForm),
        source: 'manual',
      })
    }

    resetManualRecipeBuilder()
  }

  // Switching the barcode input mode and updating the form values and default amount to match.
  // Defaulting the weight input to the actual serving size so the values shown match what's on the package.
  const handleBarcodeModeChange = (mode) => {
    setBarcodeMode(mode)
    if (mode === 'servings') {
      setBarcodeAmount('1')
      if (barcodePerServing) setPhotoForm((current) => ({ ...current, ...barcodePerServing }))
    } else {
      setBarcodeAmount(String(barcodeServingAmount || 100))
      if (barcodePerServing) setPhotoForm((current) => ({ ...current, ...barcodePerServing }))
    }
  }

  // Scaling the barcode nutrition values by the chosen amount and submitting.
  const handlePhotoSubmit = (event) => {
    event.preventDefault()

    if (!photoForm.name.trim() || !photoForm.calories) {
      return
    }

    // Scaling by number of servings in servings mode, or by weight relative to the serving size in grams/mL mode.
    const amount = Number(barcodeAmount) || (barcodeMode === 'servings' ? 1 : barcodeServingAmount || 100)
    const scale = barcodeMode === 'servings' ? amount : amount / (barcodeServingAmount || 100)
    const scaled = scaleNutrition({
      calories: Number(photoForm.calories) || 0,
      protein: Number(photoForm.protein) || 0,
      carbs: Number(photoForm.carbs) || 0,
      fat: Number(photoForm.fat) || 0,
    }, scale)

    onAddFood({
      name: photoForm.name.trim(),
      ...scaled,
      source: 'photo-barcode',
      foodId: photoFoodId,
      barcode: detectedBarcode,
    })

    setUploadedImage(null)
    setPhotoFoodId('')
    setDetectedBarcode('')
    setPhotoStatusMessage('')
    setPhotoErrorMessage('')
    setPhotoForm(emptyFoodForm())
    setBarcodeServingSize('')
    setBarcodeServingAmount(100)
    setBarcodeMode('servings')
    setBarcodeAmount('1')
    setBarcodeServingUnit('g')
    setBarcodePerServing(null)
    setBarcodePerHundred(null)
  }

  // Read the image, detect a barcode, then look up the food by that code.
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file || !file.type.startsWith('image/')) {
      return
    }

    setPhotoFoodId('')
    setDetectedBarcode('')
    setPhotoStatusMessage('')
    setPhotoErrorMessage('')
    setPhotoForm(emptyFoodForm())
    setBarcodeServingSize('')
    setBarcodeServingAmount(100)
    setBarcodeMode('servings')
    setBarcodeAmount('1')
    setBarcodeServingUnit('g')
    setBarcodePerServing(null)
    setBarcodePerHundred(null)

    const reader = new FileReader()
    reader.onload = () => {
      setUploadedImage(reader.result)
    }
    reader.readAsDataURL(file)

    setIsProcessing(true)

    try {
      const detector = new BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'],
      })
      const detectedCodes = await detector.detect(file)
      const firstCode = detectedCodes[0]?.rawValue

      if (!firstCode) {
        throw new Error('No barcode was found in this image.')
      }

      const foodResult = await lookupFoodByBarcode(firstCode)

      // Storing per-serving and per-100g values separately so the mode toggle can swap between them.
      const perServing = {
        calories: String(foodResult.calories),
        protein: String(foodResult.protein),
        carbs: String(foodResult.carbs),
        fat: String(foodResult.fat),
      }
      const perHundred = {
        calories: String(foodResult.calories100g ?? foodResult.calories),
        protein: String(foodResult.protein100g ?? foodResult.protein),
        carbs: String(foodResult.carbs100g ?? foodResult.carbs),
        fat: String(foodResult.fat100g ?? foodResult.fat),
      }
      setPhotoFoodId(foodResult.foodId)
      setDetectedBarcode(foodResult.barcode)
      setBarcodeServingSize(foodResult.portion ?? '100g')
      setBarcodeServingAmount(foodResult.servingAmount ?? 100)
      setBarcodeServingUnit(foodResult.servingUnit ?? 'g')
      setBarcodeMode('servings')
      setBarcodeAmount('1')
      setBarcodePerServing(perServing)
      setBarcodePerHundred(perHundred)
      setPhotoStatusMessage('Barcode detected and food details loaded.')
      setPhotoForm({
        name: buildDisplayName(foodResult),
        ...perServing,
      })
    } catch (error) {
      console.error('[AddFoodForm] barcode photo lookup failed:', error)
      setPhotoErrorMessage(error.message || 'Unable to read barcode from this image.')
      setPhotoForm(emptyFoodForm())
    } finally {
      setIsProcessing(false)
      event.target.value = ''
    }
  }

  const handleRemovePhoto = () => {
    setUploadedImage(null)
    setIsProcessing(false)
    setPhotoFoodId('')
    setDetectedBarcode('')
    setPhotoStatusMessage('')
    setPhotoErrorMessage('')
    setPhotoForm(emptyFoodForm())
    setBarcodeServingSize('')
    setBarcodeMode('servings')
    setBarcodeAmount('1')
    setBarcodeServingUnit('g')
    setBarcodePerServing(null)
    setBarcodePerHundred(null)
  }

  return (
    <section className="food-form">
      <div className="food-form__header">
        <div>
          <h3 className="food-form__title">Add Food Entry</h3>
          <p className="food-form__description">Log a new food item to track your nutrition</p>
        </div>

        <button
          className="food-form__icon-button"
          type="button"
          aria-label="Close add food form"
          onClick={onCancel}
        >
          <X size={16} />
        </button>
      </div>

      <div className="food-form__tabs" role="tablist" aria-label="Add food entry methods">
        <button
          className={activeTab === 'quick-add' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
          type="button"
          onClick={() => setActiveTab('quick-add')}
        >
          Quick Add
        </button>
        <button
          className={activeTab === 'manual' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
          type="button"
          onClick={() => setActiveTab('manual')}
        >
          Manual
        </button>
        <button
          className={activeTab === 'photo' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
          type="button"
          onClick={() => setActiveTab('photo')}
        >
          Upload Barcode
        </button>
      </div>

      {activeTab === 'quick-add' ? (
        <div className="food-form__section">
          <div className="food-form__search-row">
            <label className="food-form__search">
              <Search size={16} />
              <input
                type="text"
                value={searchQuery}
                placeholder="Search for food (e.g., Apple, Egg, Carrot)"
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleSearch()
                  }
                }}
              />
            </label>

            <button className="food-form__primary-button" type="button" onClick={() => handleSearch()}>
              Search
            </button>
          </div>

          <label className="food-form__checkbox">
            <input
              type="checkbox"
              checked={includeBranded}
              onChange={(event) => setIncludeBranded(event.target.checked)}
            />
            <span>Include branded foods</span>
          </label>

          {searchResults.length === 0 ? (
            <div className="food-form__group">
              <p className="food-form__section-label">Recently Searched</p>
              <div className="food-form__badges">
                {RECENT_SEARCHES.map((item) => (
                  <button
                    className="food-form__badge"
                    type="button"
                    key={item}
                    onClick={() => handleSearch(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="food-form__group">
              <p className="food-form__section-label">Search Results</p>
              <div className="food-form__result-list">
                {visibleResults.map((food) => {
                  const isSelected = food.id === selectedFoodId

                  return (
                    <button
                      className={
                        isSelected
                          ? 'food-form__result-card food-form__result-card--selected'
                          : 'food-form__result-card'
                      }
                      type="button"
                      key={food.id}
                      onClick={() => setSelectedFoodId(food.id)}
                    >
                      <div className="food-form__result-copy">
                        <strong>{food.name}</strong>
                        {/* Showing the actual serving size when the API provides it, falling back to 100g. */}
                        <span>
                          {food.servingAmount
                            ? `${food.servingAmount}${food.servingUnit || 'g'}`
                            : food.portion}
                        </span>
                      </div>

                      <div className="food-form__result-meta">
                        <div className="food-form__result-calories">
                          {/* Scaling the displayed calories to match the serving size shown. */}
                          <strong>
                            {food.estimated ? '~' : ''}
                            {food.servingAmount
                              ? Math.round(food.calories * food.servingAmount / 100 * 10) / 10
                              : food.calories}
                          </strong>
                          <span>kcal</span>
                        </div>
                        <span
                          className={
                            isSelected
                              ? 'food-form__selection food-form__selection--selected'
                              : 'food-form__selection'
                          }
                        >
                          {isSelected ? <Check size={16} /> : <Plus size={16} />}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              {displayCount < searchResults.length ? (
                <button
                  className="food-form__secondary-button food-form__secondary-button--full"
                  type="button"
                  onClick={() => setDisplayCount((count) => count + 3)}
                >
                  Load More ({searchResults.length - displayCount} more)
                </button>
              ) : null}
            </div>
          )}

          {selectedFood ? (
            <div className="food-form__group">
              <p className="food-form__section-label">Amount</p>
              <div className="food-form__tabs">
                <button
                  className={quickAmountMode === 'servings' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                  type="button"
                  onClick={() => { setQuickAmountMode('servings'); setQuickAmountValue('1') }}
                >
                  {`Servings (${selectedFood.servingAmount || 100}${selectedFood.servingUnit || 'g'} each)`}
                </button>
                {selectedFood.servingUnit === 'mL' ? (
                  <button
                    className={quickAmountMode === 'mL' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                    type="button"
                    onClick={() => { setQuickAmountMode('mL'); setQuickAmountValue(String(selectedFood.servingAmount || 100)) }}
                  >
                    mL
                  </button>
                ) : (
                  <button
                    className={quickAmountMode === 'grams' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                    type="button"
                    onClick={() => { setQuickAmountMode('grams'); setQuickAmountValue(String(selectedFood.servingAmount || 100)) }}
                  >
                    Grams
                  </button>
                )}
              </div>
              <label className="food-form__field">
                <span>
                  {quickAmountMode === 'servings' ? 'Number of servings' : quickAmountMode === 'mL' ? 'Milliliters' : 'Grams'}
                </span>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  value={quickAmountValue}
                  onChange={(event) => setQuickAmountValue(event.target.value)}
                />
              </label>
            </div>
          ) : null}

          <div className="food-form__actions">
            <button
              className="food-form__primary-button"
              type="button"
              onClick={handleQuickAddFood}
              disabled={!selectedFood}
            >
              Add Selected Food
            </button>
            <button className="food-form__secondary-button" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {activeTab === 'manual' ? (
        <form className="food-form__section" onSubmit={handleManualSubmit}>
          <label className="food-form__field">
            <span>Food Name *</span>
            <input
              type="text"
              value={recipeName}
              placeholder="e.g., My Homemade Pasta"
              onChange={(event) => handleRecipeNameChange(event.target.value)}
              required
            />
          </label>

          <div className="food-form__group">
            <p className="food-form__section-label food-form__section-label--plain">Add Ingredients</p>

            <div className="food-form__search-row">
              <label className="food-form__search">
                <Search size={16} />
                <input
                  type="text"
                  value={manualSearchQuery}
                  placeholder="Search ingredients (e.g., Chicken, Rice)"
                  onChange={(event) => {
                    const nextQuery = event.target.value
                    setManualSearchQuery(nextQuery)

                    if (!nextQuery.trim()) {
                      handleManualSearch('')
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleManualSearch()
                    }
                  }}
                />
              </label>

              <button className="food-form__primary-button" type="button" onClick={() => handleManualSearch()}>
                Search
              </button>
            </div>

            {pendingIngredient ? (
              <div className="food-form__group">
                {/* Using the plain variant so the question reads as normal text rather than a small uppercase label. */}
                <p className="food-form__section-label food-form__section-label--plain">How much {pendingIngredient.name}?</p>
                <div className="food-form__tabs">
                  <button
                    className={ingredientAmountMode === 'servings' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                    type="button"
                    onClick={() => { setIngredientAmountMode('servings'); setIngredientAmountValue('1') }}
                  >
                    {`Servings (${pendingIngredient.servingAmount || 100}${pendingIngredient.servingUnit || 'g'} each)`}
                  </button>
                  {pendingIngredient.servingUnit === 'mL' ? (
                    <button
                      className={ingredientAmountMode === 'mL' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                      type="button"
                      onClick={() => { setIngredientAmountMode('mL'); setIngredientAmountValue(String(pendingIngredient.servingAmount || 100)) }}
                    >
                      mL
                    </button>
                  ) : (
                    <button
                      className={ingredientAmountMode === 'grams' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                      type="button"
                      onClick={() => { setIngredientAmountMode('grams'); setIngredientAmountValue(String(pendingIngredient.servingAmount || 100)) }}
                    >
                      Grams
                    </button>
                  )}
                </div>
                <label className="food-form__field">
                  <span>
                    {ingredientAmountMode === 'servings' ? 'Number of servings' : ingredientAmountMode === 'mL' ? 'Milliliters' : 'Grams'}
                  </span>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={ingredientAmountValue}
                    onChange={(event) => setIngredientAmountValue(event.target.value)}
                  />
                </label>
                <div className="food-form__actions">
                  <button className="food-form__primary-button" type="button" onClick={handleConfirmIngredient}>
                    Add Ingredient
                  </button>
                  <button className="food-form__secondary-button" type="button" onClick={() => setPendingIngredient(null)}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : manualSearchResults.length > 0 ? (
              <div className="food-form__group">
                <p className="food-form__section-label">Available Ingredients</p>

                <div className="food-form__result-list food-form__result-list--scroll">
                  {visibleManualResults.map((food) => (
                    <button
                      className="food-form__result-card"
                      type="button"
                      key={food.id}
                      onClick={() => handleSelectIngredient(food)}
                    >
                      <div className="food-form__result-copy">
                        <strong>{food.name}</strong>
                        {/* Showing the actual serving size when the API provides it, falling back to 100g. */}
                        <span>
                          {food.servingAmount
                            ? `${food.servingAmount}${food.servingUnit || 'g'}`
                            : food.portion}
                        </span>
                      </div>

                      <div className="food-form__result-meta">
                        <div className="food-form__result-calories">
                          {/* Scaling the displayed calories to match the serving size shown. */}
                          <strong>
                            {food.servingAmount
                              ? Math.round(food.calories * food.servingAmount / 100 * 10) / 10
                              : food.calories}
                          </strong>
                          <span>kcal</span>
                        </div>
                        <span className="food-form__selection">
                          <Plus size={16} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {manualDisplayCount < manualSearchResults.length ? (
                  <button
                    className="food-form__secondary-button food-form__secondary-button--full"
                    type="button"
                    onClick={() => setManualDisplayCount((count) => count + 3)}
                  >
                    Load More ({manualSearchResults.length - manualDisplayCount} more)
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {hasRecipeIngredients ? (
            <div className="food-form__group">
              <p className="food-form__section-label">Recipe Ingredients ({recipeIngredients.length})</p>

              <div className="food-form__ingredient-list">
                {recipeIngredients.map((ingredient) => (
                  <article className="food-form__ingredient-card" key={ingredient.id}>
                    <div className="food-form__ingredient-copy">
                      <strong>{ingredient.name}</strong>
                      <span>
                        {ingredient.calories} kcal • P: {ingredient.protein}g • C: {ingredient.carbs}g • F:{' '}
                        {ingredient.fat}g
                      </span>
                    </div>

                    <button
                      className="food-form__ingredient-remove"
                      type="button"
                      aria-label={`Remove ${ingredient.name}`}
                      onClick={() => handleRemoveIngredient(ingredient.id)}
                    >
                      <X size={16} />
                    </button>
                  </article>
                ))}
              </div>
            </div>
          ) : (
            <div className="food-form__divider" aria-hidden="true">
              <span>Or enter nutrition manually</span>
            </div>
          )}

          <div className="food-form__manual-grid">
            <label className="food-form__field">
              <span>Calories (kcal) *</span>
              <input
                type="number"
                min="0"
                step="any"
                value={manualForm.calories}
                placeholder="0"
                onChange={(event) => updateFormField(setManualForm, 'calories', event.target.value)}
                required
              />
            </label>

            <label className="food-form__field">
              <span>Protein (g)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={manualForm.protein}
                placeholder="0"
                onChange={(event) => updateFormField(setManualForm, 'protein', event.target.value)}
              />
            </label>

            <label className="food-form__field">
              <span>Carbs (g)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={manualForm.carbs}
                placeholder="0"
                onChange={(event) => updateFormField(setManualForm, 'carbs', event.target.value)}
              />
            </label>

            <label className="food-form__field">
              <span>Fat (g)</span>
              <input
                type="number"
                min="0"
                step="any"
                value={manualForm.fat}
                placeholder="0"
                onChange={(event) => updateFormField(setManualForm, 'fat', event.target.value)}
              />
            </label>
          </div>

          <div className="food-form__actions">
            <button
              className="food-form__primary-button"
              type="submit"
              disabled={!manualForm.name.trim() || !manualForm.calories}
            >
              {hasRecipeIngredients ? 'Add Recipe to Log' : 'Add Food'}
            </button>
            <button className="food-form__secondary-button" type="button" onClick={onCancel}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      {activeTab === 'photo' ? (
        <div className="food-form__section">
          {!uploadedImage ? (
            <>
              <div className="food-form__upload">
                <Camera size={48} />
                <h4>Upload Barcode Image</h4>
                <p>Take a photo or upload an image of a product barcode</p>

                <label className="food-form__upload-button">
                  <span>
                    <Upload size={16} />
                    <span>Choose Photo</span>
                  </span>
                  <input type="file" accept="image/*" capture="environment" onChange={handlePhotoUpload} />
                </label>
              </div>

              <button className="food-form__secondary-button" type="button" onClick={onCancel}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <div className="food-form__image-preview">
                <img src={uploadedImage} alt="Uploaded barcode" />
                <button className="food-form__remove-photo" type="button" onClick={handleRemovePhoto}>
                  <X size={16} />
                  <span>Remove</span>
                </button>
              </div>

              {isProcessing ? (
                <div className="food-form__processing">
                  <div className="food-form__spinner" />
                  <p>Scanning barcode and loading food details...</p>
                </div>
              ) : (
                <form className="food-form__manual-grid" onSubmit={handlePhotoSubmit}>
                  {photoStatusMessage ? (
                    <p className="food-form__success">{photoStatusMessage}</p>
                  ) : null}

                  {detectedBarcode ? (
                    <p className="food-form__photo-meta">Detected barcode: {detectedBarcode}</p>
                  ) : null}

                  {photoErrorMessage ? (
                    <p className="food-form__error">{photoErrorMessage}</p>
                  ) : null}

                  <label className="food-form__field food-form__field--full">
                    <span>Food Name *</span>
                    <input
                      type="text"
                      value={photoForm.name}
                      onChange={(event) => updateFormField(setPhotoForm, 'name', event.target.value)}
                      required
                    />
                  </label>

                  {/* Spanning both columns so the tabs aren't squished into half the form width. */}
                  <div className="food-form__group food-form__field--full">
                    <p className="food-form__section-label">Amount</p>
                    <div className="food-form__tabs">
                      <button
                        className={barcodeMode === 'servings' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                        type="button"
                        onClick={() => handleBarcodeModeChange('servings')}
                      >
                        Servings
                      </button>
                      {barcodeServingUnit === 'mL' ? (
                        <button
                          className={barcodeMode === 'mL' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                          type="button"
                          onClick={() => handleBarcodeModeChange('mL')}
                        >
                          mL
                        </button>
                      ) : (
                        <button
                          className={barcodeMode === 'grams' ? 'food-form__tab food-form__tab--active' : 'food-form__tab'}
                          type="button"
                          onClick={() => handleBarcodeModeChange('grams')}
                        >
                          Grams
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="food-form__field food-form__field--full">
                    <span>
                      {barcodeMode === 'servings'
                        ? `Number of servings (1 serving = ${barcodeServingSize || '100g'})`
                        : barcodeMode === 'mL'
                        ? 'Milliliters'
                        : 'Grams'}
                    </span>
                    <input
                      type="number"
                      min="0.1"
                      step="any"
                      value={barcodeAmount}
                      onChange={(event) => setBarcodeAmount(event.target.value)}
                    />
                  </label>

                  <label className="food-form__field">
                    <span>
                      {barcodeMode === 'servings'
                        ? 'Calories per serving (kcal) *'
                        : `Calories per ${barcodeServingAmount}${barcodeServingUnit} (kcal) *`}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={photoForm.calories}
                      onChange={(event) => updateFormField(setPhotoForm, 'calories', event.target.value)}
                      required
                    />
                  </label>

                  <label className="food-form__field">
                    <span>
                      {barcodeMode === 'servings'
                        ? 'Protein per serving (g)'
                        : `Protein per ${barcodeServingAmount}${barcodeServingUnit} (g)`}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={photoForm.protein}
                      onChange={(event) => updateFormField(setPhotoForm, 'protein', event.target.value)}
                    />
                  </label>

                  <label className="food-form__field">
                    <span>
                      {barcodeMode === 'servings'
                        ? 'Carbs per serving (g)'
                        : `Carbs per ${barcodeServingAmount}${barcodeServingUnit} (g)`}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={photoForm.carbs}
                      onChange={(event) => updateFormField(setPhotoForm, 'carbs', event.target.value)}
                    />
                  </label>

                  <label className="food-form__field">
                    <span>
                      {barcodeMode === 'servings'
                        ? 'Fat per serving (g)'
                        : `Fat per ${barcodeServingAmount}${barcodeServingUnit} (g)`}
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={photoForm.fat}
                      onChange={(event) => updateFormField(setPhotoForm, 'fat', event.target.value)}
                    />
                  </label>

                  <div className="food-form__actions">
                    <button className="food-form__primary-button" type="submit">
                      Add Food
                    </button>
                    <button className="food-form__secondary-button" type="button" onClick={onCancel}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}

export default AddFoodForm
