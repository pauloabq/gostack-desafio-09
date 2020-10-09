import { getRepository, Repository, In } from 'typeorm';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICreateProductDTO from '@modules/products/dtos/ICreateProductDTO';
import IUpdateProductsQuantityDTO from '@modules/products/dtos/IUpdateProductsQuantityDTO';
import Product from '../entities/Product';

interface IFindProducts {
  id: string;
}

class ProductsRepository implements IProductsRepository {
  private ormRepository: Repository<Product>;

  constructor() {
    this.ormRepository = getRepository(Product);
  }

  public async create({
    name,
    price,
    quantity,
  }: ICreateProductDTO): Promise<Product> {
    const product = this.ormRepository.create({
      name,
      price,
      quantity,
    });
    await this.ormRepository.save(product);
    return product;
  }

  public async findByName(name: string): Promise<Product | undefined> {
    const product = this.ormRepository.findOne({
      where: {
        name,
      },
    });
    return product;
  }

  public async findAllById(products: IFindProducts[]): Promise<Product[]> {
    const productsList = products.map(product => product.id);

    const productFound = await this.ormRepository.find({
      where: {
        id: In(productsList),
      },
    });

    return productFound;
  }

  // Se vc tiver um array da instacia do Item, e dps passar ele pro save
  // Ele vai atualizar em bulk
  // Ou seja, vc pode buscar todos, alterar a quantity no codigo, e passar esse mesmo array para o save que ele vai atualizar

  public async updateQuantity(
    products: IUpdateProductsQuantityDTO[],
  ): Promise<Product[]> {
    // recebo: array com { id, quantidade }
    // preciso: atualizar tabela de produtos conforme informação anterior
    const productsList = products.map(product => product.id);
    const productFound = await this.ormRepository.find({
      where: {
        id: In(productsList),
      },
    });
    const productsToUpdate = productFound.map(product => ({
      ...product,
      quantity: products.find(p => p.id === product.id)?.quantity,
    }));

    const productsUpdated = this.ormRepository.save(productsToUpdate);
    return productsUpdated;
  }
}

export default ProductsRepository;
