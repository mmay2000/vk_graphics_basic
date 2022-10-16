#include "simple_compute.h"

#include <vk_pipeline.h>
#include <vk_buffers.h>
#include <vk_utils.h>

#include <chrono>
#include <random>

SimpleCompute::SimpleCompute(uint32_t a_length) : m_length(a_length)
{
#ifdef NDEBUG
  m_enableValidation = false;
#else
  m_enableValidation = true;
#endif
}

void SimpleCompute::SetupValidationLayers()
{
  m_validationLayers.push_back("VK_LAYER_KHRONOS_validation");
  m_validationLayers.push_back("VK_LAYER_LUNARG_monitor");
}

void SimpleCompute::InitVulkan(const char** a_instanceExtensions, uint32_t a_instanceExtensionsCount, uint32_t a_deviceId)
{
  m_instanceExtensions.clear();
  for (uint32_t i = 0; i < a_instanceExtensionsCount; ++i) {
    m_instanceExtensions.push_back(a_instanceExtensions[i]);
  }
  SetupValidationLayers();
  VK_CHECK_RESULT(volkInitialize());
  CreateInstance();
  volkLoadInstance(m_instance);

  CreateDevice(a_deviceId);
  volkLoadDevice(m_device);

  m_commandPool = vk_utils::createCommandPool(m_device, m_queueFamilyIDXs.compute, VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT);

  m_cmdBufferCompute = vk_utils::createCommandBuffers(m_device, m_commandPool, 1)[0];
  
  m_pCopyHelper = std::make_shared<vk_utils::SimpleCopyHelper>(m_physicalDevice, m_device, m_transferQueue, m_queueFamilyIDXs.compute, 8*1024*1024);
}


void SimpleCompute::CreateInstance()
{
  VkApplicationInfo appInfo = {};
  appInfo.sType = VK_STRUCTURE_TYPE_APPLICATION_INFO;
  appInfo.pNext = nullptr;
  appInfo.pApplicationName = "VkRender";
  appInfo.applicationVersion = VK_MAKE_VERSION(0, 1, 0);
  appInfo.pEngineName = "SimpleCompute";
  appInfo.engineVersion = VK_MAKE_VERSION(0, 1, 0);
  appInfo.apiVersion = VK_MAKE_VERSION(1, 1, 0);

  m_instance = vk_utils::createInstance(m_enableValidation, m_validationLayers, m_instanceExtensions, &appInfo);
  if (m_enableValidation)
    vk_utils::initDebugReportCallback(m_instance, &debugReportCallbackFn, &m_debugReportCallback);
}

void SimpleCompute::CreateDevice(uint32_t a_deviceId)
{
  m_physicalDevice = vk_utils::findPhysicalDevice(m_instance, true, a_deviceId, m_deviceExtensions);

  m_device = vk_utils::createLogicalDevice(m_physicalDevice, m_validationLayers, m_deviceExtensions,
                                           m_enabledDeviceFeatures, m_queueFamilyIDXs,
                                           VK_QUEUE_COMPUTE_BIT | VK_QUEUE_TRANSFER_BIT);

  vkGetDeviceQueue(m_device, m_queueFamilyIDXs.compute, 0, &m_computeQueue);
  vkGetDeviceQueue(m_device, m_queueFamilyIDXs.transfer, 0, &m_transferQueue);
}


void SimpleCompute::SetupSimplePipeline()
{
  std::vector<std::pair<VkDescriptorType, uint32_t> > dtypes = {
      {VK_DESCRIPTOR_TYPE_STORAGE_BUFFER,             2}
  };

  // Создание и аллокация буферов
  m_A = vk_utils::createBuffer(m_device, sizeof(double) * m_length, VK_BUFFER_USAGE_STORAGE_BUFFER_BIT |
                                                                       VK_BUFFER_USAGE_TRANSFER_DST_BIT);
  m_sum = vk_utils::createBuffer(m_device, sizeof(double) * m_length, VK_BUFFER_USAGE_STORAGE_BUFFER_BIT |
                                                                       VK_BUFFER_USAGE_TRANSFER_SRC_BIT);
  vk_utils::allocateAndBindWithPadding(m_device, m_physicalDevice, {m_A,  m_sum}, 0);

  m_pBindings = std::make_shared<vk_utils::DescriptorMaker>(m_device, dtypes, 1);

  // Создание descriptor set для передачи буферов в шейдер
  m_pBindings->BindBegin(VK_SHADER_STAGE_COMPUTE_BIT);
  m_pBindings->BindBuffer(0, m_A);
  m_pBindings->BindBuffer(1, m_sum);
  m_pBindings->BindEnd(&m_sumDS, &m_sumDSLayout);

  // Заполнение буферов
  std::vector<double> values(m_length);
  std::srand(std::time(nullptr));
  const int MIN = 25000000;
  const int MAX = 25000100;

  for (uint32_t i = 0; i < values.size(); ++i)
  {
    values[i] = MIN + (double)(rand()) / ((double)(RAND_MAX / (MAX - MIN)));
  }

  m_B = values;
  m_pCopyHelper->UpdateBuffer(m_A, 0, values.data(), sizeof(double) * values.size());
  
}

void SimpleCompute::BuildCommandBufferSimple(VkCommandBuffer a_cmdBuff, VkPipeline)
{
  vkResetCommandBuffer(a_cmdBuff, 0);

  VkCommandBufferBeginInfo beginInfo = {};
  beginInfo.sType = VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO;
  beginInfo.flags = VK_COMMAND_BUFFER_USAGE_SIMULTANEOUS_USE_BIT;

  // Заполняем буфер команд
  VK_CHECK_RESULT(vkBeginCommandBuffer(a_cmdBuff, &beginInfo));

  vkCmdBindPipeline      (a_cmdBuff, VK_PIPELINE_BIND_POINT_COMPUTE, m_pipeline);
  vkCmdBindDescriptorSets(a_cmdBuff, VK_PIPELINE_BIND_POINT_COMPUTE, m_layout, 0, 1, &m_sumDS, 0, NULL);

  vkCmdPushConstants(a_cmdBuff, m_layout, VK_SHADER_STAGE_COMPUTE_BIT, 0, sizeof(m_length), &m_length);

  vkCmdDispatch(a_cmdBuff, m_length / 32 + 1, 1, 1);

  VK_CHECK_RESULT(vkEndCommandBuffer(a_cmdBuff));
}


void SimpleCompute::CleanupPipeline()
{
  if (m_cmdBufferCompute)
  {
    vkFreeCommandBuffers(m_device, m_commandPool, 1, &m_cmdBufferCompute);
  }

  vkDestroyBuffer(m_device, m_A, nullptr);
  vkDestroyBuffer(m_device, m_sum, nullptr);

  vkDestroyPipelineLayout(m_device, m_layout, nullptr);
  vkDestroyPipeline(m_device, m_pipeline, nullptr);
}


void SimpleCompute::Cleanup()
{
  CleanupPipeline();

  if (m_commandPool != VK_NULL_HANDLE)
  {
    vkDestroyCommandPool(m_device, m_commandPool, nullptr);
  }
}


void SimpleCompute::CreateComputePipeline(const char *shaderfilename)
{
  // Загружаем шейдер
  std::vector<uint32_t> code = vk_utils::readSPVFile(shaderfilename);
      //../resources/shaders/simple.comp.spv");
  VkShaderModuleCreateInfo createInfo = {};
  createInfo.sType    = VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO;
  createInfo.pCode    = code.data();
  createInfo.codeSize = code.size()*sizeof(uint32_t);
    
  VkShaderModule shaderModule;
  // Создаём шейдер в вулкане
  VK_CHECK_RESULT(vkCreateShaderModule(m_device, &createInfo, NULL, &shaderModule));

  VkPipelineShaderStageCreateInfo shaderStageCreateInfo = {};
  shaderStageCreateInfo.sType  = VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO;
  shaderStageCreateInfo.stage  = VK_SHADER_STAGE_COMPUTE_BIT;
  shaderStageCreateInfo.module = shaderModule;
  shaderStageCreateInfo.pName  = "main";

  VkPushConstantRange pcRange = {};
  pcRange.offset = 0;
  pcRange.size = sizeof(m_length);
  pcRange.stageFlags = VK_SHADER_STAGE_COMPUTE_BIT;

  // Создаём layout для pipeline
  VkPipelineLayoutCreateInfo pipelineLayoutCreateInfo = {};
  pipelineLayoutCreateInfo.sType          = VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO;
  pipelineLayoutCreateInfo.setLayoutCount = 1;
  pipelineLayoutCreateInfo.pSetLayouts    = &m_sumDSLayout;
  pipelineLayoutCreateInfo.pushConstantRangeCount = 1;
  pipelineLayoutCreateInfo.pPushConstantRanges = &pcRange;
  VK_CHECK_RESULT(vkCreatePipelineLayout(m_device, &pipelineLayoutCreateInfo, NULL, &m_layout));

  VkComputePipelineCreateInfo pipelineCreateInfo = {};
  pipelineCreateInfo.sType  = VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO;
  pipelineCreateInfo.stage  = shaderStageCreateInfo;
  pipelineCreateInfo.layout = m_layout;

  // Создаём pipeline - объект, который выставляет шейдер и его параметры
  VK_CHECK_RESULT(vkCreateComputePipelines(m_device, VK_NULL_HANDLE, 1, &pipelineCreateInfo, NULL, &m_pipeline));

  vkDestroyShaderModule(m_device, shaderModule, nullptr);
}


void SimpleCompute::Execute()
{
  double mean1;

  SetupSimplePipeline();

  for (int shadersNum = 0; shadersNum < 2; ++shadersNum)
  {
    
    CreateComputePipeline((shadersNum == 0) ? ("../resources/shaders/simple.comp.spv") : ("../resources/shaders/simple_shared.comp.spv"));

    BuildCommandBufferSimple(m_cmdBufferCompute, nullptr);

    VkSubmitInfo submitInfo       = {};
    submitInfo.sType              = VK_STRUCTURE_TYPE_SUBMIT_INFO;
    submitInfo.commandBufferCount = 1;
    submitInfo.pCommandBuffers    = &m_cmdBufferCompute;

    VkFenceCreateInfo fenceCreateInfo = {};
    fenceCreateInfo.sType             = VK_STRUCTURE_TYPE_FENCE_CREATE_INFO;
    fenceCreateInfo.flags             = 0;
    VK_CHECK_RESULT(vkCreateFence(m_device, &fenceCreateInfo, NULL, &m_fence));

    mean1       = 0.0;

    auto start1 = std::chrono::high_resolution_clock::now();
    // Отправляем буфер команд на выполнение
    VK_CHECK_RESULT(vkQueueSubmit(m_computeQueue, 1, &submitInfo, m_fence));


    //Ждём конца выполнения команд
    
    VK_CHECK_RESULT(vkWaitForFences(m_device, 1, &m_fence, VK_TRUE, 100000000000));

    std::vector<double> values(m_length);
    m_pCopyHelper->ReadBuffer(m_sum, 0, values.data(), sizeof(double) * values.size());


    for (auto v : values)
    {
      mean1 += v;
    }

    mean1 /= values.size();

    auto end1 = std::chrono::high_resolution_clock::now();


    std::cout << std::endl;
    if (shadersNum == 0)
    {
      std::cout << "not shared memory on GPU:" << std::endl;
    }
    else
    {
      std::cout << "shared memory on GPU:" << std::endl;
    }
    std::cout << "mean:\t" << mean1 << std::endl;
    std::cout << "time:\t" << std::chrono::duration<float, std::milli>{ end1 - start1 }.count() << std::endl;
    std::cout << std::endl;
  }

  mean1    = 0.0;
  double filtred = 0.0;
  m_C.resize(m_B.size());
  auto start2   = std::chrono::high_resolution_clock::now();
  for (uint32_t i = 0; i < m_B.size(); ++i)
  {
    filtred = 0.0;
    for (int j = -3; j < 4; ++j)
    {
      if ((i+j >= 0) && (i+j < m_B.size()))
        filtred += m_B[i+j] / 7.0;
    }
    
     m_C[i] = (m_B[i] - filtred);

  }

  for (uint32_t i = 0; i < m_C.size(); ++i)
  {
    mean1 += m_C[i];
  }


  mean1 /= m_B.size();

  auto end2 = std::chrono::high_resolution_clock::now();
  std::cout << "CPU:" << std::endl;
  std::cout << "mean:\t" << mean1 << std::endl;
  std::cout << "time:\t" << std::chrono::duration<float, std::milli>{ end2 - start2 }.count() << std::endl;
}
