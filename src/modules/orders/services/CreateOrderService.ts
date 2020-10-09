import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,
    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    // procura clientes pelo id
    const customerExists = await this.customersRepository.findById(customer_id);
    if (!customerExists) {
      throw new AppError('Could not find any costumer with given id');
    }

    // busca os produtos no banco pelo ID
    const foudDatabaseProducts = await this.productsRepository.findAllById(
      products,
    );
    if (!foudDatabaseProducts.length) {
      throw new AppError('Could not find any product with given ids');
    }

    // dentre os produtos passados, verifica se algum deles não existe
    const databaseProductsIds = foudDatabaseProducts.map(product => product.id);
    const checkProductsList = products.filter(
      product => !databaseProductsIds.includes(product.id),
    );
    if (checkProductsList.length > 0) {
      throw new AppError(
        `Could not find a product with id ${checkProductsList[0].id}`,
      );
    }
    // console.log.log('Mapping product', product)
    // verifica se algum produto não tem quantidade disponível
    // const findProductsWithNoQuantityAvailable = products.filter(product => {
    //   // return product;
    //   return foudDatabaseProducts.filter(dbProduct => {
    //     console.log(
    //       'dbProduct.quantity',
    //       dbProduct.quantity,
    //       'product.quantity',
    //       product.quantity,
    //     );
    //     return (
    //       dbProduct.id === product.id && dbProduct.quantity < product.quantity
    //     );
    //   });
    // });

    const findProductsWithNoQuantityAvailable = foudDatabaseProducts.filter(
      dbProduct =>
        products.some(
          p => dbProduct.id === p.id && dbProduct.quantity < p.quantity,
        ),
    );

    if (findProductsWithNoQuantityAvailable.length > 0) {
      throw new AppError(`There are some products with unavailable quantity`);
    }

    // define o formato de dados para salvar um novo pedido
    const serializedProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: foudDatabaseProducts.filter(p => p.id === product.id)[0].price,
    }));

    // cria o novo pedido
    const newOrder = this.ordersRepository.create({
      customer: customerExists,
      products: serializedProducts,
    });

    // alterar a quantidade no estoque
    const updateQuantity = foudDatabaseProducts.map(dbProduct => ({
      id: dbProduct.id,
      quantity:
        dbProduct.quantity -
        products.filter(p => dbProduct.id === p.id)[0].quantity,
    }));
    await this.productsRepository.updateQuantity(updateQuantity);
    return newOrder;
  }
}

export default CreateOrderService;
