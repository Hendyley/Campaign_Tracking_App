
@description('The web app. It becomes <name>.azurewebsites.net.')
@minLength(2)
@maxLength(60)
param appName string

@description('Azure region. Defaults to the resource group location.')
param location string = resourceGroup().location

@description('Database connection string.')
@secure()
param sqlConnectionString string

@description('App Service Plan size.')
@allowed([
  'B1'
  'B2'
  'P0v3'
])
param skuName string = 'B1'

@description('Linux runtime stack. This project using Dotnet 10.0')
param dotnetcoreVersion string = 'DOTNETCORE|10.0'

@description('Tags applied to every resource.')
param tags object = {
  app: 'campaign-tracking'
  environment: 'dev'
}


// Create an App Service plan for the web app
resource plan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: '${appName}-plan'
  location: location
  tags: tags
  kind: 'linux'
  sku: {
    name: skuName
  }
  properties: {
    reserved: true 
  }
}

//Create an App Service web app
resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: appName
  location: location
  tags: tags
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: dotnetcoreVersion
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      http20Enabled: true
      alwaysOn: true
      appSettings: [
        {
          name: 'ConnectionStrings__DefaultConnection'
          value: sqlConnectionString
          
        }
      ]
    }
  }
}


// Output the web app URL
output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output principalId string = webApp.identity.principalId
