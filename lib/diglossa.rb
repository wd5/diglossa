module Diglossa

  %w{rubygems yajl yaml json rest_client i18n}.each { |x| require x }

  require File.expand_path(File.join(File.dirname(__FILE__), 'core_ext'))
  #require File.expand_path(File.join(File.dirname(__FILE__), 'paradigm'))

  VERSION = '0.4 RC1 pre'
  Lang = "latin"
  DBD = "http://admin:kjre4317@localhost:5984/diglossa"
  DB = "http://admin:kjre4317@localhost:5984"

  I18n.available_locales = [:ru, :en]

  def base_dir
    File.expand_path(File.join(File.dirname(__FILE__), '../'))
  end

  def lib_dir
    File.expand_path(File.join("~/web/diglossa.data"))
  end

  def seeds_dir
    File.join(base_dir, "db/seeds")
  end

  def views_dir
    File.join(base_dir, "db/views/")
  end

  # I18n.load_path += Dir[Rails.root.join('lib', 'locale', '*.{rb,yml}')]

  I18n.load_path +=  Dir[File.join(File.expand_path('lib/locale'), '*.{rb,yml}')]
  # def extract_locale_from_subdomain
  #   parsed_locale = request.subdomains.first
  #   I18n.available_locales.include?(parsed_locale.to_sym) ? parsed_locale : nil
  # end

  module_function :base_dir, :lib_dir, :views_dir, :seeds_dir

end
