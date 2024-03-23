// Function to append category information to the DOM
function appendCategoryToElement(categoryInfo, parentId, subcategoryId, variantId) {
  const element = document.getElementById('categoryList');
  if (!element) {
    console.error('Category list element not found.');
    return;
  }

  const listItem = document.createElement('li');
  const link = document.createElement('a');
  link.href = '#'; // Set href to "#" for now, will be updated dynamically
  link.textContent = categoryInfo;
  link.dataset.parentId = parentId;
  link.dataset.subcategoryId = subcategoryId;
  link.dataset.variantId = variantId;

  // Update the event listener for vulnerability links
  link.addEventListener('click', function (event) {
    event.preventDefault(); // Prevent the default link behavior

    // Parse the clicked category hierarchy
    const categoryHierarchy = this.textContent.split(' >> ');

    // Ensure categoryHierarchy has at least one element
    if (categoryHierarchy.length < 1) {
      console.error('Invalid category hierarchy format:', this.textContent);
      return;
    }

    // Extract parent, subcategory, and variant names
    const parentName = categoryHierarchy[0].includes(':') ? categoryHierarchy[0].split(': ')[1].trim() : categoryHierarchy[0];
    const subcategoryName = categoryHierarchy.length > 1 ? categoryHierarchy[1].trim() : null;
    const variantName = categoryHierarchy.length > 2 ? categoryHierarchy[2].trim() : null;

    // Construct an array of vulnerability names
    const vulnerabilityNames = [parentName];
    if (subcategoryName) vulnerabilityNames.push(subcategoryName);
    if (variantName) vulnerabilityNames.push(variantName);


    localStorage.setItem('vulnerabilityNames', JSON.stringify(vulnerabilityNames));

    // Navigate to markdown.html
    window.location.href = 'markdown.html';

    // fetchMarkdownContent(vulnerabilityNames);
  });

  // Function to retrieve category ID from aliases data
  function getCategoryId(name) {
    const alias = aliasesData.alias.find(entry => entry.name === name);
    if (alias) {
      return alias.id;
    } else {
      console.error(`Alias not found for category name: ${name}`);
      return null;
    }
  }

  listItem.appendChild(link);
  element.appendChild(listItem);
}

// Define a global variable to store the aliases data
let aliasesData = null;

// Fetch the aliases data from the server
fetch('http://localhost:8888/.netlify/functions/server/aliases')
  .then(response => response.json())
  .then(data => {
    // Store the aliases data globally
    aliasesData = data;
    if (!aliasesData) {
      console.error('Aliases data not available.');
      return;
    } else {
      console.log('Aliases  :', aliasesData);

    }

  })
  .catch(error => console.error('Error fetching aliases:', error));




async function fetchMarkdownContent(vulnerabilityNames) {
  // Check if aliasesData is not available
  if (!aliasesData) {
    try {
      // Fetch the aliases data from the server
      const response = await fetch('http://localhost:8888/.netlify/functions/server/aliases');
      if (!response.ok) {
        throw new Error('Failed to fetch aliases data');
      }
      // Parse the response data as JSON
      aliasesData = await response.json();
    } catch (error) {
      console.error('Error fetching aliases:', error);
      return; // Exit the function if fetching aliases fails
    }
  }

  try {
    // Ensure vulnerabilityNames is an array
    if (!Array.isArray(vulnerabilityNames)) {
      throw new Error('Invalid vulnerability names.');
    }

    // Find the IDs corresponding to the given vulnerability names using the aliases data
    const ids = [];
    for (const name of vulnerabilityNames) {
      const alias = aliasesData.alias.find(entry => entry.name === name);
      if (alias) {
        ids.push(alias.id);
      } else {
        console.error(`Alias not found for vulnerability name: ${name}`);
        return;
      }
    }

    // Construct the URL based on the IDs
    const url = `http://localhost:8888/.netlify/functions/server/markdown/${ids.join('/')}`;

    // Fetch the markdown content
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        // Handle 404 error: Render a 404 page
        render404Page();
      } else {
        throw new Error('Failed to fetch markdown content');
      }
    } else {
      const data = await response.json();
      // Handle the markdown content as needed
      console.log(data.content);
      renderMarkdownContent(data.content);
    }

  } catch (error) {
    console.error('Error fetching markdown content:', error);
  }
}

// Function to render a 404 page
function render404Page() {
  const markdownContentElement = document.getElementById('markdownContent');
  if (markdownContentElement) {
    // Fetch the content of the 404.html file
    fetch('404.html')
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch 404 page content');
        }
        return response.text();
      })
      .then(htmlContent => {
        // Set the fetched HTML content as the inner HTML of the markdownContentElement
        markdownContentElement.innerHTML = htmlContent;
      })
      .catch(error => {
        console.error('Error fetching 404 page content:', error);
      });
  } else {
    console.error('Markdown content element not found.');
  }
}


// Function to handle back navigation
function navigateBack() {
  // Remove stored data from local storage
  localStorage.removeItem('vulnerabilityNames');

  // Navigate back to index.html
  window.location.href = 'index.html';
}


// Function to render markdown content in the HTML page
function renderMarkdownContent(content) {
  // Assuming you have a div element with id "markdownContent" to display the markdown content
  const markdownContentElement = document.getElementById('markdownContent');
  if (markdownContentElement) {
    markdownContentElement.innerHTML = marked.parse(content);

  } else {
    console.error('Markdown content element not found.');
  }

  if (!content || typeof content !== 'string') {
    console.error('Error rendering markdown content: Invalid or empty content.');
    return;
  }


  // Hide the category list element
  const categoryListElement = document.getElementById('categoryList');
  if (categoryListElement) {
    categoryListElement.style.display = 'none';
  }
}



// Fetch categories data from the server
fetch('http://localhost:8888/.netlify/functions/server/categories')
  .then(response => response.json())
  .then(data => {
    // Function to collect all categories in an array
    function collectCategories(categories, parentPath = '', parentCategoryId = null, parentSubcategoryId = null) {
      categories.forEach(category => {
        const currentPath = parentPath + (parentPath ? ' >> ' : '') + category.name;
        const currentParentId = parentCategoryId || (category.type === 'category' ? category.id : parentCategoryId);
        const currentSubcategoryId = parentSubcategoryId || (category.type === 'subcategory' ? category.id : parentSubcategoryId);

        // console.log(category.id)
        // console.log(`Processing category: ${currentPath}, Parent ID: ${currentParentId}, Subcategory ID: ${currentSubcategoryId}`);

        if (category.children && category.children.length > 0) {
          // Recursively collect categories for children
          collectCategories(category.children, currentPath, currentParentId, currentSubcategoryId);
        } else {
          // Add the current category and its IDs to the array
          allCategories.push({ path: currentPath, priority: category.priority, parentId: currentParentId, subcategoryId: currentSubcategoryId, variantId: category.id });
          // console.log(`Added category: ${currentPath}, Parent ID: ${currentParentId}, Subcategory ID: ${currentSubcategoryId}`);
        }
      });
    }

    // Declare the allCategories array
    const allCategories = [];

    collectCategories(data.categories);

    // Sort the categories by priority
    allCategories.sort((a, b) => {
      const priorityA = a.priority !== null ? a.priority : Number.MAX_SAFE_INTEGER;
      const priorityB = b.priority !== null ? b.priority : Number.MAX_SAFE_INTEGER;
      return priorityA - priorityB;
    });

    // Print the categories
    allCategories.forEach(category => {
      const currentPriorityLabel = category.priority !== null ? `P${category.priority}` : `Varies`;
      appendCategoryToElement(`${currentPriorityLabel}: ${category.path}`, category.parentId, category.subcategoryId, category.variantId);
    });

  })
  .catch(error => console.error('Error fetching categories:', error));





