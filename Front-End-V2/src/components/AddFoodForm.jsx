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

function AddFoodForm({ onAddFood, onCancel }) {
  const [activeTab, setActiveTab] = useState('quick-add')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedFoodId, setSelectedFoodId] = useState(null)
  const [displayCount, setDisplayCount] = useState(3)
  const [recipeName, setRecipeName] = useState('')
  const [recipeIngredients, setRecipeIngredients] = useState([])
  const [manualSearchQuery, setManualSearchQuery] = useState('')
  const [manualSearchResults, setManualSearchResults] = useState([])
  const [manualDisplayCount, setManualDisplayCount] = useState(3)
  const [manualForm, setManualForm] = useState(emptyFoodForm())
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [photoForm, setPhotoForm] = useState(emptyFoodForm())
  const [photoFoodId, setPhotoFoodId] = useState('')
  const [detectedBarcode, setDetectedBarcode] = useState('')
  const [photoStatusMessage, setPhotoStatusMessage] = useState('')
  const [photoErrorMessage, setPhotoErrorMessage] = useState('')
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

    if (!cleanedQuery) {
      setSearchResults([])
      setSelectedFoodId(null)
      setDisplayCount(3)
      return
    }

    try {
      const results = await searchFoods(cleanedQuery)
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

  // Add the selected quick-add food directly to the log.
  const handleQuickAddFood = () => {
    if (!selectedFood) {
      return
    }

    onAddFood({
      source: 'quick-add',
      foodId: selectedFood.foodId,
      name: selectedFood.name,
      calories: selectedFood.calories,
      protein: selectedFood.protein,
      carbs: selectedFood.carbs,
      fat: selectedFood.fat,
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

  // Submit the extracted photo values.
  const handlePhotoSubmit = (event) => {
    event.preventDefault()

    if (!photoForm.name.trim() || !photoForm.calories) {
      return
    }

    onAddFood({
      ...buildFoodEntry(photoForm),
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

      setPhotoFoodId(foodResult.foodId)
      setDetectedBarcode(foodResult.barcode)
      setPhotoStatusMessage('Barcode detected and food details loaded.')
      setPhotoForm({
        name: buildDisplayName(foodResult),
        calories: String(foodResult.calories),
        protein: String(foodResult.protein),
        carbs: String(foodResult.carbs),
        fat: String(foodResult.fat),
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
          Photo
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
                        <span>{food.portion}</span>
                      </div>

                      <div className="food-form__result-meta">
                        <div className="food-form__result-calories">
                          <strong>{food.calories}</strong>
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

            {manualSearchResults.length > 0 ? (
              <div className="food-form__group">
                <p className="food-form__section-label">Available Ingredients</p>

                <div className="food-form__result-list food-form__result-list--scroll">
                  {visibleManualResults.map((food) => (
                    <button
                      className="food-form__result-card"
                      type="button"
                      key={food.id}
                      onClick={() => handleAddIngredient(food)}
                    >
                      <div className="food-form__result-copy">
                        <strong>{food.name}</strong>
                        <span>{food.portion}</span>
                      </div>

                      <div className="food-form__result-meta">
                        <div className="food-form__result-calories">
                          <strong>{food.calories}</strong>
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
                step="0.1"
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
                step="0.1"
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
                step="0.1"
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
                step="0.1"
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
                <h4>Upload Nutrition Label</h4>
                <p>Take a photo or upload an image of a nutrition label</p>

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
                <img src={uploadedImage} alt="Uploaded nutrition label" />
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

                  <label className="food-form__field">
                    <span>Calories (kcal) *</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={photoForm.calories}
                      onChange={(event) => updateFormField(setPhotoForm, 'calories', event.target.value)}
                      required
                    />
                  </label>

                  <label className="food-form__field">
                    <span>Protein (g)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={photoForm.protein}
                      onChange={(event) => updateFormField(setPhotoForm, 'protein', event.target.value)}
                    />
                  </label>

                  <label className="food-form__field">
                    <span>Carbs (g)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={photoForm.carbs}
                      onChange={(event) => updateFormField(setPhotoForm, 'carbs', event.target.value)}
                    />
                  </label>

                  <label className="food-form__field">
                    <span>Fat (g)</span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
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
